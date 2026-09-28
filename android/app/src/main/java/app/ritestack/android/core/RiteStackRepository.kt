package app.ritestack.android.core

import android.content.Context
import kotlinx.coroutines.CancellationException
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.sync.Mutex
import java.math.BigDecimal
import java.time.Instant

/** Operations are serialized, including sign-out, so a late response cannot restore an old account. */
class RiteStackRepository internal constructor(private val api: AccountGateway) {
    constructor(context: Context) : this(Api(context.applicationContext))
    private val operation = Mutex()
    private val mutableState = MutableStateFlow(AppState())
    val state: StateFlow<AppState> = mutableState.asStateFlow()
    fun clearError() { mutableState.update { it.copy(error = null) } }
    suspend fun start() {
        perform {
            api.restore()
            mutableState.update { it.copy(user = api.session?.user) }
            if (api.session != null) load()
        }
        mutableState.update { it.copy(loading = false) }
    }
    suspend fun requestCode(email: String): Boolean = perform {
        require(email.trim().matches(Regex("^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$"))) { "Enter a valid email address." }
        api.requestCode(email.trim())
    }
    suspend fun verify(email: String, code: String): Boolean = authenticate { api.verify(email.trim(), code.trim()) }
    suspend fun signInWithPassword(email: String, password: String): Boolean = authenticate { api.signInWithPassword(email.trim(), password) }
    private suspend fun authenticate(action: suspend () -> Unit): Boolean = perform {
        action()
        mutableState.value = AppState(user = api.session?.user, loading = true, busy = true)
        load()
    }
    suspend fun refresh(): Boolean = perform {
        if (!state.value.demo && state.value.user != null) load()
    }
    private suspend fun load() {
        // Remove cached ritual access before any network request; failures never retain stale permission.
        mutableState.update { it.copy(profile = null, loading = true) }
        val profile = api.profile()
        val tools = api.tools()
        mutableState.update { it.copy(profile = profile, tools = tools, lastSynced = Instant.now(), loading = false) }
    }
    suspend fun save(tool: Tool, isNew: Boolean): Boolean = perform {
        val error = Tool.validate(tool.name, tool.monthlyCost.toPlainString(), tool.cancelUrl)
        require(error == null) { error ?: "Invalid tool." }
        require(Day.valid(tool.renewDate) && (tool.lastUsed == null || Day.valid(tool.lastUsed))) { "Enter valid dates in YYYY-MM-DD format." }
        require(tool.userId == state.value.userId) { "This tool belongs to another account." }
        if (isNew) require(tool.decision == Decision.UNDECIDED) { "Add the tool before making a decision." }
        val previous = state.value.tools.firstOrNull { it.id == tool.id }
        if (!isNew) requireNotNull(previous) { "This tool no longer exists. Refresh your stack." }
        if (previous != null && (tool.decision != previous.decision || tool.cutAt != previous.cutAt || tool.remindAt != previous.remindAt)) requireAccess()
        store(if (state.value.demo) tool else api.save(tool, isNew))
    }
    suspend fun decide(tool: Tool, decision: Decision): Boolean = perform {
        requireAccess()
        val current = state.value.tools.firstOrNull { it.id == tool.id } ?: throw Exception("This tool no longer exists. Refresh your stack.")
        val next = current.deciding(decision)
        store(if (state.value.demo) next else api.save(next, false))
    }
    private fun requireAccess() { check(state.value.canDecide) { "Your account does not currently include ritual access. Inventory and cut receipts remain available." } }
    private fun store(tool: Tool) { mutableState.update { old -> old.copy(tools = if (old.tools.any { it.id == tool.id }) old.tools.map { if (it.id == tool.id) tool else it } else old.tools + tool) } }
    suspend fun remove(tool: Tool): Boolean = perform {
        require(tool.userId == state.value.userId) { "This tool belongs to another account." }
        if (!state.value.demo) api.remove(tool)
        mutableState.update { it.copy(tools = it.tools.filterNot { row -> row.id == tool.id }) }
    }
    suspend fun deleteAccount(): Boolean = perform {
        if (!state.value.demo) api.deleteAccount()
        api.clear()
        mutableState.value = AppState(loading = false, busy = true)
    }
    suspend fun signOut() {
        operation.lock()
        try {
            mutableState.value = AppState(loading = false, busy = true)
            api.signOut()
        } finally { mutableState.update { it.copy(busy = false) }; operation.unlock() }
    }
    fun startDemo() {
        if (operation.isLocked || state.value.user != null) return
        val id = AppState.DEMO_ID
        val today = Day.today()
        mutableState.value = AppState(demo = true, loading = false, tools = listOf(
            Tool(userId = id, name = "Cursor", monthlyCost = BigDecimal("20"), renewDate = Day.add(3, today), isSample = true),
            Tool(userId = id, name = "ChatGPT", monthlyCost = BigDecimal("20"), renewDate = Day.add(8, today), isSample = true),
            Tool(userId = id, name = "Design tool", monthlyCost = BigDecimal("15"), renewDate = Day.add(21, today), category = "Design", decision = Decision.PAUSE, remindAt = Day.add(5, today), isSample = true),
            Tool(userId = id, name = "Writing tool", monthlyCost = BigDecimal("12"), renewDate = today, category = "Productivity", decision = Decision.CUT, cutAt = Day.add(-2, today), isSample = true)
        ))
    }
    private suspend fun perform(action: suspend () -> Unit): Boolean {
        if (!operation.tryLock()) return false
        mutableState.update { it.copy(busy = true, error = null) }
        return try { action(); true }
        catch (error: CancellationException) { throw error }
        catch (error: SignedOut) { api.clear(); mutableState.value = AppState(loading = false, error = error.message); false }
        catch (error: Exception) {
            val message = if (error is java.io.IOException) "Could not connect. Check your connection and try again." else error.message ?: "Something went wrong. Please try again."
            mutableState.update { it.copy(error = message) }; false
        } finally { mutableState.update { it.copy(busy = false, loading = false) }; operation.unlock() }
    }
}
