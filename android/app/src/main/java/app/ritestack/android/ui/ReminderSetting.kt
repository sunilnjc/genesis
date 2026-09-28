package app.ritestack.android.ui

import android.Manifest
import android.os.Build
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.foundation.layout.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.lifecycle.Lifecycle
import androidx.lifecycle.compose.LifecycleEventEffect
import app.ritestack.android.core.AppState
import app.ritestack.android.core.Tool
import app.ritestack.android.reminders.Reminders
import kotlinx.coroutines.launch
import kotlinx.coroutines.CancellationException

@Composable
fun ReminderCoordinator(state: AppState) {
    val context = LocalContext.current.applicationContext
    val scope = rememberCoroutineScope()
    var failed by remember { mutableStateOf(false) }
    suspend fun sync() {
        try { Reminders.sync(context, state.tools, state.user?.id, state.canDecide && !state.demo) }
        catch (cancelled: CancellationException) { throw cancelled }
        catch (_: Exception) { failed = true }
    }
    LaunchedEffect(state.tools, state.user?.id, state.canDecide, state.loading) {
        // Do not discard the opt-in while the initial session is being restored.
        if (!state.loading) sync()
    }
    LifecycleEventEffect(Lifecycle.Event.ON_START) {
        if (!state.loading) scope.launch { sync() }
    }
    if (failed) AlertDialog(onDismissRequest = { failed = false }, title = { Text("Reminders unavailable") }, text = { Text("Local reminders could not be updated. Check notification settings and reopen RiteStack to retry.") }, confirmButton = { TextButton(onClick = { failed = false }) { Text("OK") } })
}

@Composable
fun ReminderSetting(tools: List<Tool>, userId: String?, enabledAccount: Boolean) {
    val context = LocalContext.current.applicationContext
    val scope = rememberCoroutineScope()
    var enabled by remember(userId) { mutableStateOf(Reminders.enabled(context, userId)) }
    var denied by remember { mutableStateOf(false) }
    var scheduleFailed by remember { mutableStateOf(false) }
    fun change(value: Boolean) {
        if (userId == null) return
        Reminders.setEnabled(context, userId, value)
        enabled = value
        scope.launch {
            try { Reminders.sync(context, tools, userId, enabledAccount); scheduleFailed = false }
            catch (cancelled: CancellationException) { throw cancelled }
            catch (_: Exception) { scheduleFailed = true }
        }
    }
    val launcher = rememberLauncherForActivityResult(ActivityResultContracts.RequestPermission()) { granted -> denied = !granted; change(granted) }
    Row(Modifier.fillMaxWidth()) {
        Text("Local review reminders", Modifier.weight(1f))
        Switch(checked = enabled, enabled = userId != null && (enabledAccount || enabled), onCheckedChange = { value ->
            if (value && Build.VERSION.SDK_INT >= 33 && !Reminders.permitted(context)) launcher.launch(Manifest.permission.POST_NOTIFICATIONS)
            else { denied = value && !Reminders.permitted(context); change(value && !denied) }
        })
    }
    Text("Optional reminders around 9 AM on renewal and pause-review dates. Android may delay delivery. No tool names or amounts appear in notifications.", style = MaterialTheme.typography.bodySmall)
    if (!enabledAccount) Text("Reminders require active ritual access.", style = MaterialTheme.typography.bodySmall)
    if (denied || (enabled && !Reminders.permitted(context))) Text("Notifications are disabled. Enable them in Android Settings for RiteStack.", style = MaterialTheme.typography.bodySmall)
    if (scheduleFailed) Text("Could not update reminders. Toggle this setting to retry.", style = MaterialTheme.typography.bodySmall)
}
