package app.ritestack.android.core

import java.math.BigDecimal
import java.net.URI
import java.text.NumberFormat
import java.time.Instant
import java.time.LocalDate
import java.time.format.DateTimeFormatter
import java.util.Locale
import java.util.UUID

enum class Decision(val wire: String, val title: String) { UNDECIDED("undecided", "Undecided"), KEEP("keep", "Keep"), CUT("cut", "Cut"), PAUSE("pause", "Pause") }
object Day {
    fun today(): String = LocalDate.now().toString()
    fun add(days: Int, to: String): String = LocalDate.parse(to).plusDays(days.toLong()).toString()
    fun display(day: String): String = runCatching { LocalDate.parse(day).format(DateTimeFormatter.ofPattern("MMM d, yyyy")) }.getOrDefault(day)
    fun valid(day: String): Boolean = runCatching { LocalDate.parse(day).toString() == day }.getOrDefault(false)
}
data class Tool(
    val id: String = UUID.randomUUID().toString(), val userId: String, val name: String,
    val monthlyCost: BigDecimal, val renewDate: String, val category: String = "AI", val cancelUrl: String = "",
    val lastUsed: String? = null, val decision: Decision = Decision.UNDECIDED, val remindAt: String? = null,
    val isSample: Boolean = false, val cutAt: String? = null,
    val createdAt: String = Instant.now().toString(), val updatedAt: String = Instant.now().toString()
) {
    val money: String get() = usd(monthlyCost)
    val safeCancelUrl: String? get() = safeUrl(cancelUrl)
    fun deciding(decision: Decision, today: String = Day.today()) = copy(decision = decision,
        remindAt = if (decision == Decision.PAUSE) Day.add(30, today) else null,
        cutAt = if (decision == Decision.CUT) today else null, updatedAt = Instant.now().toString())
    fun needsDecision(today: String = Day.today()): Boolean = when (decision) {
        Decision.CUT -> false
        Decision.UNDECIDED -> true
        Decision.PAUSE -> remindAt?.let { it <= today } ?: false
        Decision.KEEP -> renewDate <= Day.add(14, today)
    }
    companion object {
        val categories = listOf("AI", "Dev tools", "Hosting", "Design", "Productivity", "Domains", "Other")
        fun safeUrl(raw: String): String? = runCatching {
            val uri = URI(raw)
            raw.takeIf { uri.scheme?.lowercase(Locale.ROOT) in listOf("https", "http") && !uri.host.isNullOrBlank() && uri.rawUserInfo == null }
        }.getOrNull()
        fun validate(name: String, cost: String, cancelUrl: String): String? {
            if (name.isBlank()) return "Enter the tool name."
            if (name.length > 80) return "Keep the name to 80 characters or fewer."
            val amount = cost.toBigDecimalOrNull()
            if (!cost.matches(Regex("^\\d+(\\.\\d{1,2})?$")) || amount == null || amount < BigDecimal.ZERO || amount > BigDecimal("10000")) return "Enter a monthly amount from 0 to 10,000, with up to two decimal places."
            if (cancelUrl.isNotEmpty() && safeUrl(cancelUrl) == null) return "Enter a valid http or https billing URL."
            return null
        }
        fun wall(tools: List<Tool>, today: String = Day.today()): List<Tool> {
            val end = Day.add(14, today)
            fun inWindow(day: String?) = day != null && day >= today && day <= end
            fun next(tool: Tool): String = listOfNotNull(tool.renewDate.takeIf { inWindow(it) }, tool.remindAt?.takeIf { tool.decision == Decision.PAUSE && inWindow(it) }).minOrNull() ?: end
            return tools.filter { it.decision != Decision.CUT && (inWindow(it.renewDate) || (it.decision == Decision.PAUSE && inWindow(it.remindAt))) }.sortedWith(compareBy({ next(it) }, { it.name }))
        }
    }
}
fun usd(amount: BigDecimal): String = NumberFormat.getCurrencyInstance(Locale.US).format(amount)
data class AuthUser(val id: String, val email: String?)
data class Profile(val trialEndsAt: String, val packPaidAt: String?) {
    fun allowsRitual(now: Instant = Instant.now()): Boolean = packPaidAt != null || runCatching { Instant.parse(trialEndsAt) > now }.getOrDefault(false)
}
data class AppState(val tools: List<Tool> = emptyList(), val profile: Profile? = null, val user: AuthUser? = null,
    val demo: Boolean = false, val loading: Boolean = true, val busy: Boolean = false, val error: String? = null, val lastSynced: Instant? = null) {
    val signedIn get() = user != null || demo
    val canDecide get() = demo || (profile?.allowsRitual() ?: false)
    val userId get() = user?.id ?: DEMO_ID
    val monthlyBurn get() = tools.filter { it.decision != Decision.CUT }.fold(BigDecimal.ZERO) { sum, tool -> sum + tool.monthlyCost }
    val cutAmount get() = cuts.fold(BigDecimal.ZERO) { sum, tool -> sum + tool.monthlyCost }
    val cuts get() = tools.filter { it.decision == Decision.CUT }.sortedByDescending { it.cutAt ?: "" }
    companion object { const val DEMO_ID = "00000000-0000-0000-0000-000000000001" }
}
