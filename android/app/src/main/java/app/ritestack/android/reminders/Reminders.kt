package app.ritestack.android.reminders

import android.Manifest
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import android.content.pm.PackageManager
import android.os.Build
import androidx.core.app.NotificationCompat
import androidx.core.content.ContextCompat
import androidx.work.CoroutineWorker
import androidx.work.Data
import androidx.work.OneTimeWorkRequestBuilder
import androidx.work.WorkManager
import androidx.work.WorkerParameters
import app.ritestack.android.MainActivity
import app.ritestack.android.R
import app.ritestack.android.core.Decision
import app.ritestack.android.core.Tool
import java.time.Duration
import java.time.LocalDate
import java.time.ZonedDateTime
import java.util.UUID
import java.util.concurrent.TimeUnit
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import kotlinx.coroutines.sync.Mutex
import kotlinx.coroutines.sync.withLock

/** Only generic reminder titles and scheduling dates are persisted; no tool names or prices. */
object Reminders {
    private const val TAG = "ritestack-local-reminders"
    private const val CHANNEL = "ritestack-reviews"
    private val mutex = Mutex()
    private fun preferences(context: Context) = context.getSharedPreferences(TAG, Context.MODE_PRIVATE)
    fun enabled(context: Context, userId: String?) = userId != null && preferences(context).getString("owner", null) == userId && preferences(context).getBoolean("enabled", false)
    fun setEnabled(context: Context, userId: String, value: Boolean) { preferences(context).edit().putString("owner", userId).putBoolean("enabled", value).apply() }
    fun permitted(context: Context): Boolean = (Build.VERSION.SDK_INT < 33 || ContextCompat.checkSelfPermission(context, Manifest.permission.POST_NOTIFICATIONS) == PackageManager.PERMISSION_GRANTED) && context.getSystemService(NotificationManager::class.java).areNotificationsEnabled()
    suspend fun sync(context: Context, tools: List<Tool>, userId: String?, allowed: Boolean) = withContext(Dispatchers.IO) {
        mutex.withLock {
            val prefs = preferences(context)
            val generation = UUID.randomUUID().toString()
            val manager = WorkManager.getInstance(context)
            // Invalidate workers before canceling, including workers already starting.
            val persisted = prefs.edit().putString("generation", generation).commit()
            manager.cancelAllWorkByTag(TAG).result.get()
            context.getSystemService(NotificationManager::class.java).cancelAll()
            if (userId == null) { prefs.edit().clear().commit(); return@withLock }
            if (!persisted || !allowed || !enabled(context, userId) || !permitted(context)) return@withLock
            val now = ZonedDateTime.now()
            val events = reminderEvents(tools, now)
            val jobs = events.mapIndexed { index, (at, title) ->
                OneTimeWorkRequestBuilder<ReminderWorker>()
                    .setInitialDelay(Duration.between(now, at).toMillis(), TimeUnit.MILLISECONDS)
                    .setInputData(Data.Builder().putString("generation", generation).putString("title", title).putInt("id", index).build())
                    .addTag(TAG).build()
            }
            if (jobs.isNotEmpty()) manager.enqueue(jobs).result.get()
        }
    }
    internal suspend fun deliver(context: Context, data: Data) = mutex.withLock {
        val prefs = preferences(context)
        if (!prefs.getBoolean("enabled", false) || prefs.getString("generation", null) != data.getString("generation") || !permitted(context)) return@withLock
        val manager = context.getSystemService(NotificationManager::class.java)
        manager.createNotificationChannel(NotificationChannel(CHANNEL, "Tool reviews", NotificationManager.IMPORTANCE_DEFAULT))
        val intent = PendingIntent.getActivity(context, 0, Intent(context, MainActivity::class.java), PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE)
        val notification = NotificationCompat.Builder(context, CHANNEL).setSmallIcon(R.drawable.ic_notification)
            .setContentTitle(data.getString("title") ?: "Tool review")
            .setContentText("Open RiteStack to review your tools.")
            .setContentIntent(intent).setAutoCancel(true).setVisibility(NotificationCompat.VISIBILITY_PRIVATE).build()
        try { manager.notify(data.getInt("id", 0), notification) } catch (_: SecurityException) { /* Permission revoked during delivery. */ }
    }
}
class ReminderWorker(context: Context, parameters: WorkerParameters) : CoroutineWorker(context, parameters) {
    override suspend fun doWork(): Result { Reminders.deliver(applicationContext, inputData); return Result.success() }
}

/** One generic reminder per date/type, capped to bound OS work and storage. */
internal fun reminderEvents(tools: List<Tool>, now: ZonedDateTime): List<Pair<ZonedDateTime, String>> =
    tools.filter { it.decision != Decision.CUT }.flatMap { tool ->
        listOfNotNull(tool.renewDate to "Renewal review", tool.remindAt?.takeIf { tool.decision == Decision.PAUSE }?.let { it to "Pause reminder" })
    }.mapNotNull { (day, title) ->
        runCatching { LocalDate.parse(day).atTime(9, 0).atZone(now.zone) to title }.getOrNull()
    }.filter { it.first.isAfter(now) }.sortedBy { it.first }.distinct().take(60)
