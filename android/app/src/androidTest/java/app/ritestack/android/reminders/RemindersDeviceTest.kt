package app.ritestack.android.reminders

import android.Manifest
import android.app.Notification
import android.app.NotificationManager
import android.content.Context
import android.os.Build
import androidx.test.platform.app.InstrumentationRegistry
import androidx.work.Data
import androidx.work.WorkInfo
import androidx.work.WorkManager
import app.ritestack.android.core.Day
import app.ritestack.android.core.Tool
import kotlinx.coroutines.delay
import kotlinx.coroutines.runBlocking
import kotlinx.coroutines.withTimeout
import org.junit.Assert.*
import org.junit.Test
import java.math.BigDecimal
import java.util.concurrent.TimeUnit

/** Local device-only test. Uses no accounts, network, or real subscription data. */
class RemindersDeviceTest {
    @Test fun schedulesGenericNotificationsAndSignOutInvalidatesThem() = runBlocking {
        val instrumentation = InstrumentationRegistry.getInstrumentation()
        val context = instrumentation.targetContext
        if (Build.VERSION.SDK_INT >= 33) {
            instrumentation.uiAutomation.grantRuntimePermission(context.packageName, Manifest.permission.POST_NOTIFICATIONS)
        }
        val tag = "ritestack-local-reminders"
        val userId = "00000000-0000-0000-0000-000000000088"
        val manager = WorkManager.getInstance(context)
        val notifications = context.getSystemService(NotificationManager::class.java)
        val prefs = context.getSharedPreferences(tag, Context.MODE_PRIVATE)
        val privateName = "PRIVATE QA TOOL 72"
        val tool = Tool(userId = userId, name = privateName, monthlyCost = BigDecimal("9876.54"), renewDate = Day.add(2, Day.today()))
        try {
            Reminders.sync(context, emptyList(), null, false)
            assertTrue("Notifications should be permitted on the test emulator.", Reminders.permitted(context))
            Reminders.setEnabled(context, userId, true)
            Reminders.sync(context, listOf(tool), userId, true)
            assertTrue(Reminders.enabled(context, userId))
            val jobs = manager.getWorkInfosByTag(tag).get(10, TimeUnit.SECONDS)
            assertEquals("One future renewal should be enqueued.", 1, jobs.count { it.state == WorkInfo.State.ENQUEUED })
            val generation = prefs.getString("generation", null)
            assertNotNull("Scheduling generation must be persisted.", generation)
            val data = Data.Builder().putString("generation", generation).putString("title", "Renewal review").putInt("id", 7288).build()
            Reminders.deliver(context, data)
            withTimeout(5000) { while (notifications.activeNotifications.none { it.id == 7288 }) delay(50) }
            val notification = notifications.activeNotifications.single { it.id == 7288 }.notification
            assertEquals("Renewal review", notification.extras.getCharSequence(Notification.EXTRA_TITLE).toString())
            assertEquals("Open RiteStack to review your tools.", notification.extras.getCharSequence(Notification.EXTRA_TEXT).toString())
            val displayed = notification.extras.getCharSequence(Notification.EXTRA_TITLE).toString() + notification.extras.getCharSequence(Notification.EXTRA_TEXT).toString()
            assertFalse(displayed.contains(privateName)); assertFalse(displayed.contains("9876.54"))
            assertEquals(Notification.VISIBILITY_PRIVATE, notification.visibility)
            assertNotNull(notification.contentIntent)

            Reminders.sync(context, emptyList(), null, false)
            assertFalse(Reminders.enabled(context, userId))
            assertFalse(prefs.contains("owner")); assertFalse(prefs.contains("generation"))
            assertTrue(manager.getWorkInfosByTag(tag).get(10, TimeUnit.SECONDS).all { it.state.isFinished })
            withTimeout(5000) { while (notifications.activeNotifications.isNotEmpty()) delay(50) }
            Reminders.deliver(context, data)
            // Delivery is synchronous; a stale generation must never submit a replacement notification.
            assertTrue("Stale reminder survived sign-out.", notifications.activeNotifications.isEmpty())
        } finally {
            Reminders.sync(context, emptyList(), null, false)
            notifications.cancelAll()
        }
    }
}
