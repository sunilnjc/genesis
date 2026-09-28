package app.ritestack.android.core

import org.junit.Assert.*
import org.junit.Test
import java.math.BigDecimal
import java.time.Instant

class ModelsTest {
    private fun tool(day: String = "2026-09-28", decision: Decision = Decision.UNDECIDED) = Tool(userId = AppState.DEMO_ID, name = "Tool", monthlyCost = BigDecimal("20"), renewDate = day, decision = decision)
    @Test fun moneyValidationRejectsAmbiguousAndUnsafeInputs() {
        listOf("-1", "NaN", "1e2", "1,000", "10000.01", "1.234", "", ".5").forEach { assertNotNull(it, Tool.validate("Tool", it, "")) }
        listOf("0", "1.23", "10000").forEach { assertNull(Tool.validate("Tool", it, "")) }
        assertNotNull(Tool.validate(" ", "20", ""))
    }
    @Test fun billingUrlsCannotContainCredentialsOrActiveSchemes() {
        listOf("javascript:alert(1)", "https://user:pass@example.com", "file:///etc/passwd", "https://", "https://exa mple.com").forEach { assertNull(it, Tool.safeUrl(it)) }
        assertEquals("https://example.com/billing", Tool.safeUrl("https://example.com/billing"))
    }
    @Test fun wallUsesInclusiveFourteenDayWindowAndPauseReminder() {
        val today = "2026-09-28"
        val list = listOf(tool(today), tool("2026-10-12"), tool("2026-10-13"), tool("2026-09-27"), tool(today, Decision.CUT), tool("2026-11-20", Decision.PAUSE).copy(remindAt = "2026-10-01"))
        assertEquals(listOf(list[0], list[5], list[1]), Tool.wall(list, today))
    }
    @Test fun decisionsClearObsoleteDatesAndPreserveUnknownLastUse() {
        val paused = tool().deciding(Decision.PAUSE, "2026-09-28")
        assertEquals("2026-10-28", paused.remindAt)
        val cut = paused.deciding(Decision.CUT, "2026-09-29")
        assertNull(cut.remindAt); assertEquals("2026-09-29", cut.cutAt)
        val kept = cut.deciding(Decision.KEEP)
        assertNull(kept.remindAt); assertNull(kept.cutAt); assertNull(kept.lastUsed)
    }
    @Test fun entitlementFailsClosedAtExpiryAndMalformedDates() {
        val now = Instant.parse("2026-09-28T12:00:00Z")
        assertFalse(Profile("bad", null).allowsRitual(now))
        assertFalse(Profile(now.toString(), null).allowsRitual(now))
        assertTrue(Profile("2026-09-28T12:00:01Z", null).allowsRitual(now))
        assertTrue(Profile("bad", "2026-01-01T00:00:00Z").allowsRitual(now))
        assertFalse(AppState().canDecide)
    }
    @Test fun totalsIncludePausedButExcludeCutFromBurn() {
        val state = AppState(tools = listOf(tool(), tool(decision = Decision.PAUSE), tool(decision = Decision.CUT)))
        assertEquals(BigDecimal("40"), state.monthlyBurn)
        assertEquals(BigDecimal("20"), state.cutAmount)
    }
    @Test fun dateArithmeticHandlesLeapYearAndInvalidDates() {
        assertEquals("2024-02-29", Day.add(1, "2024-02-28"))
        assertFalse(Day.valid("2026-02-29")); assertFalse(Day.valid("2026-9-1"))
    }
    @Test fun pauseOnlyNeedsDecisionWhenReminderIsDue() {
        val paused = tool(decision = Decision.PAUSE).copy(remindAt = "2026-10-01")
        assertFalse(paused.needsDecision("2026-09-30"))
        assertTrue(paused.needsDecision("2026-10-01"))
        assertFalse(paused.copy(remindAt = null).needsDecision("2026-10-01"))
    }
}
