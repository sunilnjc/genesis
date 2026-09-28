package app.ritestack.android.core

import android.content.Context
import kotlinx.coroutines.CancellationException
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.sync.Mutex
import kotlinx.coroutines.sync.withLock
import kotlinx.coroutines.withContext
import org.json.JSONArray
import org.json.JSONObject
import java.net.HttpURLConnection
import java.net.URL
import java.time.Instant
import java.util.UUID

internal class SignedOut : Exception("Your session has expired. Sign in again.")
internal data class Session(val accessToken: String, val refreshToken: String, val expiresAt: Long, val user: AuthUser) {
    fun json() = JSONObject().put("access_token", accessToken).put("refresh_token", refreshToken).put("expires_at", expiresAt)
        .put("user", JSONObject().put("id", user.id).put("email", user.email ?: JSONObject.NULL))
    companion object {
        fun parse(json: JSONObject): Session {
            val user = json.getJSONObject("user")
            return Session(json.getString("access_token"), json.getString("refresh_token"),
                json.optLong("expires_at", Instant.now().epochSecond + json.optLong("expires_in", 3600)),
                AuthUser(UUID.fromString(user.getString("id")).toString(), user.nullableString("email")))
        }
    }
}
internal fun JSONObject.nullableString(key: String): String? = if (isNull(key) || !has(key)) null else getString(key)
internal interface AccountGateway {
    val session: Session?
    suspend fun restore()
    suspend fun clear()
    suspend fun requestCode(email: String)
    suspend fun verify(email: String, code: String)
    suspend fun signInWithPassword(email: String, password: String)
    suspend fun tools(): List<Tool>
    suspend fun profile(): Profile
    suspend fun save(tool: Tool, isNew: Boolean): Tool
    suspend fun remove(tool: Tool)
    suspend fun deleteAccount()
    suspend fun signOut()
}
internal class Api(context: Context) : AccountGateway {
    private val storage = SecureSession(context.applicationContext)
    private val refreshMutex = Mutex()
    override var session: Session? = null
        private set
    override suspend fun restore() = withContext(Dispatchers.IO) { session = storage.read()?.let { runCatching { Session.parse(JSONObject(it)) }.getOrElse { storage.clear(); null } } }
    private suspend fun accept(value: Session) { withContext(Dispatchers.IO) { storage.save(value.json().toString()) }; session = value }
    override suspend fun clear() { session = null; withContext(Dispatchers.IO) { storage.clear() } }
    override suspend fun requestCode(email: String) { send("/auth/v1/otp", "POST", JSONObject().put("email", email).put("create_user", true)) }
    override suspend fun verify(email: String, code: String) { accept(Session.parse(JSONObject(send("/auth/v1/verify", "POST", JSONObject().put("email", email).put("token", code).put("type", "email"))))) }
    override suspend fun signInWithPassword(email: String, password: String) { accept(Session.parse(JSONObject(send("/auth/v1/token?grant_type=password", "POST", JSONObject().put("email", email).put("password", password))))) }
    private suspend fun token(): String = refreshMutex.withLock {
        val current = session ?: throw SignedOut()
        if (current.expiresAt > Instant.now().epochSecond + 60) return@withLock current.accessToken
        try {
            accept(Session.parse(JSONObject(send("/auth/v1/token?grant_type=refresh_token", "POST", JSONObject().put("refresh_token", current.refreshToken)))))
            session!!.accessToken
        } catch (error: SignedOut) { clear(); throw error }
    }
    override suspend fun tools(): List<Tool> {
        val token = token()
        val id = session?.user?.id ?: throw SignedOut()
        val rows = JSONArray(send("/rest/v1/subscriptions?user_id=eq.$id&select=*&order=created_at.asc", token = token))
        return (0 until rows.length()).map { parseTool(rows.getJSONObject(it)) }
    }
    override suspend fun profile(): Profile {
        val raw = send("/rest/v1/rpc/ensure_own_profile", "POST", JSONObject(), token())
        val row = if (raw.trimStart().startsWith("[")) JSONArray(raw).optJSONObject(0) else JSONObject(raw)
        requireNotNull(row) { "Could not load account access." }
        return Profile(row.getString("trial_ends_at"), row.nullableString("pack_paid_at"))
    }
    override suspend fun save(tool: Tool, isNew: Boolean): Tool {
        val token = token()
        checkOwner(tool)
        val path = if (isNew) "/rest/v1/subscriptions" else "/rest/v1/subscriptions?id=eq.${tool.id}&user_id=eq.${tool.userId}"
        val rows = JSONArray(send(path, if (isNew) "POST" else "PATCH", toolJson(tool), token, "return=representation"))
        val row = rows.optJSONObject(0) ?: throw Exception("This tool no longer exists. Refresh your stack.")
        return parseTool(row)
    }
    override suspend fun remove(tool: Tool) {
        val token = token(); checkOwner(tool)
        send("/rest/v1/subscriptions?id=eq.${tool.id}&user_id=eq.${tool.userId}", "DELETE", token = token)
    }
    private fun checkOwner(tool: Tool) {
        if (session?.user?.id != tool.userId) throw SignedOut()
        UUID.fromString(tool.id); UUID.fromString(tool.userId)
    }
    override suspend fun deleteAccount() {
        request("https://ritestack.app/api/account", "DELETE", token = token(), deletion = true)
        clear()
    }
    override suspend fun signOut() {
        val old = session?.accessToken
        clear()
        if (old != null) {
            try { send("/auth/v1/logout?scope=local", "POST", token = old) }
            catch (error: CancellationException) { throw error }
            catch (_: Exception) { /* Local credentials are already erased; logout may be offline. */ }
        }
    }
    private suspend fun send(path: String, method: String = "GET", body: JSONObject? = null, token: String? = null, prefer: String? = null) =
        request(AppConfig.supabaseUrl + path, method, body, token, prefer)
    private suspend fun request(url: String, method: String, body: JSONObject? = null, token: String? = null, prefer: String? = null, deletion: Boolean = false): String = withContext(Dispatchers.IO) {
        val connection = URL(url).openConnection() as HttpURLConnection
        try {
            connection.requestMethod = method
            connection.connectTimeout = 25000; connection.readTimeout = 25000
            connection.instanceFollowRedirects = false
            connection.useCaches = false
            connection.setRequestProperty("Content-Type", "application/json")
            if (!deletion) connection.setRequestProperty("apikey", AppConfig.anonKey)
            if (token != null) connection.setRequestProperty("Authorization", "Bearer $token")
            if (prefer != null) connection.setRequestProperty("Prefer", prefer)
            if (deletion) connection.setRequestProperty("X-RiteStack-Confirm", "delete-account")
            if (body != null) { connection.doOutput = true; connection.outputStream.use { it.write(body.toString().toByteArray(Charsets.UTF_8)) } }
            val status = connection.responseCode
            if (status !in 200..299) {
                connection.errorStream?.close()
                if (url.contains("grant_type=password") && status in listOf(400, 401, 422)) throw Exception("Email or password is incorrect. Try again or use an email code.")
                if (status == 401 || (url.contains("grant_type=refresh_token") && status == 400)) throw SignedOut()
                if (status == 429) throw Exception("Too many attempts. Please wait a minute and try again.")
                if (deletion) throw Exception("Account deletion could not complete. Retry or contact hello@ritestack.app.")
                if (url.contains("/verify")) throw Exception("That code is invalid or expired. Check your latest email or request a new code.")
                throw Exception("Could not complete the request ($status). Please try again.")
            }
            connection.inputStream.bufferedReader().use { it.readText() }
        } finally { connection.disconnect() }
    }
}
internal fun toolJson(t: Tool) = JSONObject().put("id", t.id).put("user_id", t.userId).put("name", t.name)
    .put("monthly_cost", t.monthlyCost).put("renew_date", t.renewDate).put("category", t.category).put("cancel_url", t.cancelUrl)
    .put("last_used", t.lastUsed ?: JSONObject.NULL).put("decision", t.decision.wire).put("remind_at", t.remindAt ?: JSONObject.NULL)
    .put("is_sample", t.isSample).put("cut_at", t.cutAt ?: JSONObject.NULL).put("created_at", t.createdAt).put("updated_at", t.updatedAt)
internal fun parseTool(j: JSONObject) = Tool(id = UUID.fromString(j.getString("id")).toString(), userId = UUID.fromString(j.getString("user_id")).toString(),
    name = j.getString("name"), monthlyCost = j.getString("monthly_cost").toBigDecimal(), renewDate = j.getString("renew_date"), category = j.getString("category"),
    cancelUrl = j.optString("cancel_url", ""), lastUsed = j.nullableString("last_used"), decision = Decision.entries.first { it.wire == j.getString("decision") },
    remindAt = j.nullableString("remind_at"), isSample = j.optBoolean("is_sample"), cutAt = j.nullableString("cut_at"), createdAt = j.getString("created_at"), updatedAt = j.getString("updated_at"))
