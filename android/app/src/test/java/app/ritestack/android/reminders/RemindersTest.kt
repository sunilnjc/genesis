package app.ritestack.android.reminders

import app.ritestack.android.core.Decision
import app.ritestack.android.core.Tool
import org.junit.Assert.*
import org.junit.Test
import java.math.BigDecimal
import java.time.ZonedDateTime

class RemindersTest {
    private val now = ZonedDateTime.parse("2026-09-28T08:00:00+04:00[Asia/Dubai]")
    private fun tool(day: String) = Tool(userId = "sample", name = "Private name", monthlyCost = BigDecimal("999"), renewDate = day)
    @Test fun eventsAreGenericDeduplicatedAndExcludeCutsPastAndInvalidDates() {
        val tools = listOf(tool("2026-09-28"), tool("2026-09-28"), tool("2026-09-27"), tool("invalid"), tool("2026-10-01").copy(decision = Decision.CUT))
        val events = reminderEvents(tools, now)
        assertEquals(1, events.size)
        assertEquals("Renewal review", events.single().second)
        assertEquals(9, events.single().first.hour)
        assertEquals(now.zone, events.single().first.zone)
    }
    @Test fun pauseHasSeparateReviewAndOnlyFutureNineAmIsScheduled() {
        val tools = listOf(tool("2026-09-28").copy(decision = Decision.PAUSE, remindAt = "2026-09-29"))
        val events = reminderEvents(tools, now.withHour(10))
        assertEquals(1, events.size)
        assertEquals("Pause reminder", events.single().second)
        assertEquals("2026-09-29", events.single().first.toLocalDate().toString())
    }
    @Test fun workIsBoundedToFirstSixtyDates() {
        val tools = (1..100).reversed().map { tool(now.toLocalDate().plusDays(it.toLong()).toString()) }
        val events = reminderEvents(tools, now)
        assertEquals(60, events.size)
        assertTrue(events.zipWithNext().all { (a, b) -> a.first.isBefore(b.first) })
    }
}
