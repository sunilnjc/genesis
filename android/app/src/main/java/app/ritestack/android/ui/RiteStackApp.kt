package app.ritestack.android.ui

import android.app.DatePickerDialog
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.platform.LocalUriHandler
import androidx.compose.ui.platform.testTag
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import app.ritestack.android.core.*
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.delay
import kotlinx.coroutines.launch
import java.math.BigDecimal
import java.text.NumberFormat
import java.time.LocalDate
import java.util.Locale

private val LocalActionScope = staticCompositionLocalOf<CoroutineScope> { error("Action scope missing") }
private val Gold = Color(0xFFD6BA8A)
private val Background = Color(0xFF0E1010)
private val Cream = Color(0xFFF2EDE0)
private val Card = Color(0xFF1A1C1C)
private data class Provider(val name: String, val aliases: List<String>, val url: String)
private fun money(value: BigDecimal) = NumberFormat.getCurrencyInstance(Locale.US).format(value)

@Composable
fun RiteStackApp(repository: RiteStackRepository, actionScope: CoroutineScope) {
    val state by repository.state.collectAsState()
    ReminderCoordinator(state)
    CompositionLocalProvider(LocalActionScope provides actionScope) {
    MaterialTheme(colorScheme = darkColorScheme(
        primary = Gold, onPrimary = Background,
        primaryContainer = Color(0xFF423925), onPrimaryContainer = Cream,
        inversePrimary = Color(0xFF705A32),
        secondary = Gold, onSecondary = Background,
        secondaryContainer = Color(0xFF373124), onSecondaryContainer = Cream,
        tertiary = Gold, onTertiary = Background,
        tertiaryContainer = Color(0xFF373124), onTertiaryContainer = Cream,
        background = Background, onBackground = Cream,
        surface = Card, onSurface = Cream,
        surfaceVariant = Color(0xFF292C2B), onSurfaceVariant = Color(0xFFCCC8BE),
        surfaceTint = Gold,
        surfaceDim = Background, surfaceBright = Color(0xFF383B38),
        surfaceContainerLowest = Color(0xFF0A0C0C),
        surfaceContainerLow = Color(0xFF151817),
        surfaceContainer = Card,
        surfaceContainerHigh = Color(0xFF242725),
        surfaceContainerHighest = Color(0xFF30332F),
        outline = Color(0xFF969389), outlineVariant = Color(0xFF494B44),
        inverseSurface = Cream, inverseOnSurface = Background,
        error = Color(0xFFFFB4AB), onError = Color(0xFF690005),
        errorContainer = Color(0xFF93000A), onErrorContainer = Color(0xFFFFDAD6)
    )) {
        Surface(Modifier.fillMaxSize(), color = Background) {
            if (state.loading && !state.signedIn) Box(Modifier.fillMaxSize(), contentAlignment = Alignment.Center) { CircularProgressIndicator() }
            else if (state.signedIn) StackScreen(repository, state) else SignIn(repository, state)
            state.error?.let { message -> AlertDialog(onDismissRequest = repository::clearError, title = { Text("Couldn’t complete that") }, text = { Text(message) }, confirmButton = { TextButton(onClick = repository::clearError) { Text("OK") } }) }
        }
    }
}

}

@Composable private fun Panel(content: @Composable ColumnScope.() -> Unit) {
    Card(Modifier.fillMaxWidth(), colors = CardDefaults.cardColors(containerColor = Card)) { Column(Modifier.padding(20.dp), verticalArrangement = Arrangement.spacedBy(12.dp), content = content) }
}

@Composable private fun WebLink(label: String, url: String) {
    val uri = LocalUriHandler.current
    var failed by remember { mutableStateOf(false) }
    TextButton(onClick = { failed = runCatching { uri.openUri(url) }.isFailure }) { Text(label) }
    if (failed) Text("No app could open this link: $url", style = MaterialTheme.typography.bodySmall)
}

@Composable private fun SignIn(repo: RiteStackRepository, state: AppState) {
    var email by rememberSaveable { mutableStateOf("") }
    var code by rememberSaveable { mutableStateOf("") }
    var password by remember { mutableStateOf("") }
    var passwordMode by rememberSaveable { mutableStateOf(false) }
    var sentTo by rememberSaveable { mutableStateOf<String?>(null) }
    var resendSeconds by rememberSaveable { mutableIntStateOf(0) }
    val scope = LocalActionScope.current
    LaunchedEffect(resendSeconds) { if (resendSeconds > 0) { delay(1000); resendSeconds-- } }
    Column(Modifier.fillMaxSize().statusBarsPadding().navigationBarsPadding().imePadding().verticalScroll(rememberScrollState()).padding(24.dp), verticalArrangement = Arrangement.spacedBy(22.dp)) {
        Text("RITESTACK", color = Gold, letterSpacing = 5.sp, style = MaterialTheme.typography.labelLarge)
        Text("Know what stays.\nDecide what goes.", style = MaterialTheme.typography.headlineLarge, fontFamily = FontFamily.Serif)
        Text("A little clarity for the tools you pay for.", style = MaterialTheme.typography.titleMedium)
        Text("KEEP  ·  CUT  ·  PAUSE", color = Gold, letterSpacing = 2.sp)
        Panel {
            Text(if (sentTo == null) "Your stack, wherever you are" else "Check your email", style = MaterialTheme.typography.titleLarge)
            if (sentTo == null) {
                Text("Sign in or create an account with your email. Your personal stack syncs with RiteStack on the web.")
                OutlinedTextField(email, { email = it }, label = { Text("Email address") }, singleLine = true, keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Email), modifier = Modifier.fillMaxWidth().testTag("email"))
                if (passwordMode) {
                    OutlinedTextField(password, { password = it }, label = { Text("Password") }, singleLine = true, visualTransformation = androidx.compose.ui.text.input.PasswordVisualTransformation(), keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Password), modifier = Modifier.fillMaxWidth())
                    Button(enabled = email.contains('@') && password.isNotEmpty() && !state.busy, onClick = { scope.launch { if (repo.signInWithPassword(email.trim(), password)) password = "" } }) { Text("Sign in") }
                } else Button(enabled = email.contains('@') && !state.busy, onClick = { scope.launch { val address = email.trim(); if (repo.requestCode(address)) { sentTo = address; resendSeconds = 60 } } }) { Text("Email me a code") }
                TextButton(enabled = !state.busy, onClick = { passwordMode = !passwordMode; password = "" }) { Text(if (passwordMode) "Use an email code instead" else "Already have a password? Sign in") }
            } else {
                Text("Enter the one-time code sent to $sentTo. Use the code here instead of the web sign-in link.")
                OutlinedTextField(code, { code = it }, label = { Text("Sign-in code") }, singleLine = true, keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Number), modifier = Modifier.fillMaxWidth().testTag("authCode"))
                Button(enabled = code.trim().length >= 6 && !state.busy, onClick = { scope.launch { repo.verify(sentTo!!, code.trim()) } }) { Text("Verify and sign in") }
                TextButton(enabled = resendSeconds == 0 && !state.busy, onClick = { scope.launch { if (repo.requestCode(sentTo!!)) resendSeconds = 60 } }) { Text(if (resendSeconds > 0) "Resend in ${resendSeconds}s" else "Send a new code") }
                TextButton(enabled = !state.busy, onClick = { sentTo = null; code = "" }) { Text("Use another email") }
            }
            if (state.busy) LinearProgressIndicator(Modifier.fillMaxWidth())
        }
        OutlinedButton(onClick = repo::startDemo, enabled = !state.busy, modifier = Modifier.fillMaxWidth().testTag("demo")) { Text("Explore a sample stack") }
        Text("No bank connection. No inbox scanning. You add your tools and make the decisions. RiteStack never cancels a subscription for you.", style = MaterialTheme.typography.bodySmall)
        Row { WebLink("Privacy", "https://ritestack.app/mobile/privacy"); WebLink("Terms", "https://ritestack.app/mobile/terms") }
    }
}

@Composable private fun StackScreen(repo: RiteStackRepository, state: AppState) {
    var tab by rememberSaveable { mutableIntStateOf(0) }
    val titles = listOf("Decide", "Inventory", "Cuts", "Account")
    Scaffold(containerColor = Background, bottomBar = { NavigationBar(containerColor = Card, contentColor = Cream) { titles.forEachIndexed { i, title -> NavigationBarItem(colors = NavigationBarItemDefaults.colors(selectedIconColor = Gold, selectedTextColor = Gold, indicatorColor = Color(0xFF373124), unselectedIconColor = Color(0xFFCCC8BE), unselectedTextColor = Color(0xFFCCC8BE)), selected = tab == i, onClick = { tab = i }, icon = { Text(listOf("✓", "▤", "−", "○")[i]) }, label = { Text(title) }, modifier = Modifier.testTag("tab$title")) } } }) { padding ->
        Box(Modifier.padding(padding)) { if (tab == 3) Account(repo, state) else ToolList(repo, state, tab) }
    }
}

@Composable private fun ToolList(repo: RiteStackRepository, state: AppState, mode: Int) {
    var search by rememberSaveable(mode) { mutableStateOf("") }
    var next14 by rememberSaveable { mutableStateOf(true) }
    var editorOpen by remember { mutableStateOf(false) }
    var editing by remember { mutableStateOf<Tool?>(null) }
    var removing by remember { mutableStateOf<Tool?>(null) }
    var cutting by remember { mutableStateOf<Tool?>(null) }
    val scope = LocalActionScope.current
    val rows = (when (mode) { 0 -> if (next14) Tool.wall(state.tools, Day.today()) else state.tools.filter { it.needsDecision() }.sortedBy { it.renewDate }; 1 -> state.tools.sortedBy { it.name.lowercase() }; else -> state.cuts }).filter { it.name.contains(search, true) || it.category.contains(search, true) }
    LazyColumn(Modifier.fillMaxSize().testTag("toolList"), contentPadding = PaddingValues(20.dp), verticalArrangement = Arrangement.spacedBy(16.dp)) {
        item {
            Row(Modifier.fillMaxWidth(), verticalAlignment = Alignment.CenterVertically) {
                Text(listOf("Decide", "Inventory", "Cuts")[mode], style = MaterialTheme.typography.headlineLarge, modifier = Modifier.weight(1f))
                if (mode != 2) TextButton(enabled = !state.busy && !state.loading, onClick = { editing = null; editorOpen = true }, modifier = Modifier.testTag("addTool")) { Text("+ Add") }
            }
        }
        if (state.demo) item { Text("Sample stack · changes stay in this preview", color = Gold, style = MaterialTheme.typography.bodySmall) }
        item { Panel { Text(if (mode == 2) "RECORDED CUTS" else "MONTHLY STACK", color = Gold, letterSpacing = 2.sp); Text(money(if (mode == 2) state.cutAmount else state.monthlyBurn), fontFamily = FontFamily.Serif, style = MaterialTheme.typography.headlineLarge); Text(if (mode == 2) "Monthly value of tools marked cut—not verified savings." else "${state.tools.count { it.decision != Decision.CUT }} active tools · paused tools still count", style = MaterialTheme.typography.bodySmall) } }
        item { OutlinedTextField(search, { search = it }, label = { Text("Find a tool") }, singleLine = true, modifier = Modifier.fillMaxWidth()) }
        if (mode == 0) item {
            Row(verticalAlignment = Alignment.CenterVertically) { Text("Next 14 days", Modifier.weight(1f)); Switch(next14, { next14 = it }) }
            Text(if (next14) "Renewals and pause reminders, today through day 14." else "All tools that need a decision.", style = MaterialTheme.typography.bodySmall)
            if (!state.canDecide && !state.loading) Panel { Text("Your inventory stays free", style = MaterialTheme.typography.titleMedium); Text("Ritual access isn’t active on this account. You can still view and edit your tools and read your cut receipts.") }
        }
        if (state.loading || state.busy) item { LinearProgressIndicator(Modifier.fillMaxWidth()) }
        if (rows.isEmpty() && !state.loading) item { Panel { Text(if (search.isNotBlank()) "No matching tools" else when (mode) { 0 -> if (next14) "Nothing renews in 14 days" else "Nothing needs a decision"; 1 -> "Start with the tools you pay for"; else -> "Nothing cut yet" }, style = MaterialTheme.typography.titleMedium); Text(if (mode == 1) "Add a name, monthly amount, and next renewal date." else if (mode == 2) "When you cut, it lands here." else "Your full stack is always in Inventory.") } }
        items(rows, key = { it.id }) { tool -> ToolCard(tool, mode, state, onEdit = { editing = tool; editorOpen = true }, onRemove = { removing = tool }, onCut = { cutting = tool }, onDecision = { decision -> scope.launch { repo.decide(tool, decision) } }) }
        item { OutlinedButton(onClick = { scope.launch { repo.refresh() } }, enabled = !state.busy && !state.loading, modifier = Modifier.fillMaxWidth()) { Text("Refresh stack") }; Text("Amounts in USD", style = MaterialTheme.typography.bodySmall) }
    }
    if (editorOpen) ToolEditor(repo, state, editing, onDismiss = { editorOpen = false })
    removing?.let { tool -> AlertDialog(onDismissRequest = { removing = null }, title = { Text("Remove ${tool.name}?") }, text = { Text("This deletes the inventory entry. It does not cancel the subscription with its provider.") }, dismissButton = { TextButton(onClick = { removing = null }) { Text("Cancel") } }, confirmButton = { TextButton(onClick = { removing = null; scope.launch { repo.remove(tool) } }) { Text("Remove tool") } }) }
    cutting?.let { tool -> AlertDialog(onDismissRequest = { cutting = null }, title = { Text("Record this cut?") }, text = { Text("RiteStack records your decision. Complete cancellation on the provider’s site. The billing link will remain in Cuts.") }, dismissButton = { TextButton(onClick = { cutting = null }) { Text("Cancel") } }, confirmButton = { TextButton(onClick = { cutting = null; scope.launch { repo.decide(tool, Decision.CUT) } }) { Text("Record cut") } }) }
}

@OptIn(ExperimentalLayoutApi::class)
@Composable private fun ToolCard(tool: Tool, mode: Int, state: AppState, onEdit: () -> Unit, onRemove: () -> Unit, onCut: () -> Unit, onDecision: (Decision) -> Unit) {
    Panel {
        Row(verticalAlignment = Alignment.CenterVertically) { Text(tool.name, style = MaterialTheme.typography.titleLarge, modifier = Modifier.weight(1f)); Text(tool.money, style = MaterialTheme.typography.titleMedium) }
        Text(tool.category + if (tool.isSample) " · Sample" else "", style = MaterialTheme.typography.bodySmall)
        Text("${tool.decision.title} · " + if (mode == 2) tool.cutAt?.let { "Cut ${Day.display(it)}" }.orEmpty().ifEmpty { "Cut date unknown" } else "Renews ${Day.display(tool.renewDate)}", color = Gold)
        if (mode != 2) { Text("Last used: ${tool.lastUsed?.let { Day.display(it) } ?: "Unknown"}", style = MaterialTheme.typography.bodySmall); if (tool.decision == Decision.PAUSE) tool.remindAt?.let { Text("Review ${Day.display(it)}", color = Gold) } }
        tool.safeCancelUrl?.let { if (mode == 2 || state.canDecide) WebLink("Open provider billing ↗", it) }
        val enabled = !state.busy && !state.loading
        if (mode == 0) FlowRow(horizontalArrangement = Arrangement.spacedBy(6.dp), verticalArrangement = Arrangement.spacedBy(6.dp)) {
            OutlinedButton(modifier = Modifier.testTag("keep:${tool.name}"), onClick = { onDecision(Decision.KEEP) }, enabled = enabled && state.canDecide, contentPadding = PaddingValues(horizontal = 10.dp)) { Text("Keep") }
            OutlinedButton(modifier = Modifier.testTag("cut:${tool.name}"), onClick = onCut, enabled = enabled && state.canDecide, contentPadding = PaddingValues(horizontal = 10.dp)) { Text("Cut") }
            OutlinedButton(modifier = Modifier.testTag("pause:${tool.name}"), onClick = { onDecision(if (tool.decision == Decision.PAUSE) Decision.UNDECIDED else Decision.PAUSE) }, enabled = enabled && state.canDecide, contentPadding = PaddingValues(horizontal = 10.dp)) { Text(if (tool.decision == Decision.PAUSE) "Unpause" else "Pause") }
        }
        if (mode == 1) { Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) { OutlinedButton(onClick = onEdit, enabled = enabled) { Text("Edit") }; TextButton(onClick = onRemove, enabled = enabled) { Text("Remove") } }; if (tool.decision == Decision.PAUSE && state.canDecide) OutlinedButton(onClick = { onDecision(Decision.UNDECIDED) }, enabled = enabled) { Text("Unpause") } }
    }
}

@Composable private fun DateField(label: String, date: String, onChange: (String) -> Unit, maxToday: Boolean = false) {
    val context = LocalContext.current
    OutlinedButton(onClick = { val day = runCatching { LocalDate.parse(date) }.getOrDefault(LocalDate.now()); val picker = DatePickerDialog(context, { _, year, month, dayOfMonth -> onChange(LocalDate.of(year, month + 1, dayOfMonth).toString()) }, day.year, day.monthValue - 1, day.dayOfMonth); if (maxToday) picker.datePicker.maxDate = System.currentTimeMillis(); picker.show() }, modifier = Modifier.fillMaxWidth()) { Text("$label: ${Day.display(date)}") }
}

@Composable private fun ToolEditor(repo: RiteStackRepository, state: AppState, existing: Tool?, onDismiss: () -> Unit) {
    var name by rememberSaveable { mutableStateOf(existing?.name ?: "") }
    var cost by rememberSaveable { mutableStateOf(existing?.monthlyCost?.toPlainString() ?: "") }
    var category by rememberSaveable { mutableStateOf(existing?.category ?: "AI") }
    var renewal by rememberSaveable { mutableStateOf(existing?.renewDate ?: Day.today()) }
    var unknown by rememberSaveable { mutableStateOf(existing?.lastUsed == null) }
    var lastUsed by rememberSaveable { mutableStateOf(existing?.lastUsed ?: Day.today()) }
    var url by rememberSaveable { mutableStateOf(existing?.cancelUrl ?: "") }
    var error by remember { mutableStateOf<String?>(null) }
    var categoriesOpen by remember { mutableStateOf(false) }
    val context = LocalContext.current
    val providers = remember {
        runCatching { val rows = org.json.JSONArray(context.assets.open("providers.json").bufferedReader().use { it.readText() }); (0 until rows.length()).map { index -> val row = rows.getJSONObject(index); val aliases = row.getJSONArray("aliases"); Provider(row.getString("name"), (0 until aliases.length()).map { aliases.getString(it) }, row.getString("url")) } }.getOrDefault(emptyList())
    }
    val scope = LocalActionScope.current
    androidx.compose.ui.window.Dialog(onDismissRequest = { if (!state.busy) onDismiss() }, properties = androidx.compose.ui.window.DialogProperties(usePlatformDefaultWidth = false)) {
        Surface(Modifier.fillMaxSize(), color = Background) {
            Column(Modifier.statusBarsPadding().navigationBarsPadding().imePadding().verticalScroll(rememberScrollState()).padding(20.dp), verticalArrangement = Arrangement.spacedBy(14.dp)) {
                Text(if (existing == null) "Add tool" else "Edit tool", style = MaterialTheme.typography.headlineLarge)
                OutlinedTextField(name, { name = it }, label = { Text("Tool name") }, singleLine = true, modifier = Modifier.fillMaxWidth().testTag("toolName"))
                if (existing == null && name.trim().length >= 2 && url.isBlank()) providers.filter { it.name.contains(name.trim(), true) || it.aliases.any { alias -> alias.contains(name.trim(), true) } }.take(3).forEach { provider -> TextButton(onClick = { name = provider.name; url = provider.url }) { Text("Use ${provider.name} billing link") } }
                OutlinedTextField(cost, { cost = it }, label = { Text("Monthly amount (USD)") }, keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Decimal), singleLine = true, modifier = Modifier.fillMaxWidth().testTag("toolCost"))
                Box { OutlinedButton(onClick = { categoriesOpen = true }) { Text("Category: $category") }; DropdownMenu(expanded = categoriesOpen, onDismissRequest = { categoriesOpen = false }) { Tool.categories.forEach { value -> DropdownMenuItem(text = { Text(value) }, onClick = { category = value; categoriesOpen = false }) } } }
                DateField("Next renewal", renewal, { renewal = it })
                Row(verticalAlignment = Alignment.CenterVertically) { Text("Last-used date unknown", Modifier.weight(1f)); Switch(unknown, { unknown = it }) }
                if (!unknown) DateField("Last used", lastUsed, { lastUsed = it }, maxToday = true)
                Text("Use a date you know. RiteStack never guesses when you used a tool.", style = MaterialTheme.typography.bodySmall)
                OutlinedTextField(url, { url = it }, label = { Text("Provider billing URL (optional)") }, keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Uri), singleLine = true, modifier = Modifier.fillMaxWidth())
                Text("Paste the provider’s billing or cancellation page. Adding a link does not cancel anything.", style = MaterialTheme.typography.bodySmall)
                error?.let { Text(it, color = MaterialTheme.colorScheme.error, modifier = Modifier.testTag("formError")) }
                if (state.busy) LinearProgressIndicator(Modifier.fillMaxWidth())
                Row(horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                    TextButton(onClick = onDismiss, enabled = !state.busy) { Text("Cancel") }
                    Button(enabled = !state.busy, modifier = Modifier.testTag("saveTool"), onClick = {
                        val cleanCost = cost.trim().replace(',', '.')
                        error = Tool.validate(name.trim(), cleanCost, url.trim())
                        if (error == null) {
                            val tool = (existing ?: Tool(userId = state.userId, name = name.trim(), monthlyCost = BigDecimal(cleanCost), renewDate = renewal, isSample = state.demo)).copy(name = name.trim(), monthlyCost = BigDecimal(cleanCost), renewDate = renewal, category = category, cancelUrl = url.trim(), lastUsed = if (unknown) null else lastUsed)
                            scope.launch { if (repo.save(tool, existing == null)) onDismiss() else error = repo.state.value.error ?: "Could not save. Try again." }
                        }
                    }) { Text("Save") }
                }
            }
        }
    }
}

@Composable private fun Account(repo: RiteStackRepository, state: AppState) {
    var signingOut by remember { mutableStateOf(false) }
    var deleting by remember { mutableStateOf(false) }
    var confirmation by remember { mutableStateOf("") }
    val scope = LocalActionScope.current
    Column(Modifier.fillMaxSize().verticalScroll(rememberScrollState()).padding(20.dp), verticalArrangement = Arrangement.spacedBy(18.dp)) {
        Text("Account", style = MaterialTheme.typography.headlineLarge)
        Panel {
            Text(if (state.demo) "Sample preview" else state.user?.email ?: "Signed in", style = MaterialTheme.typography.titleMedium)
            Text("Access: " + if (state.demo) "Demo" else if (state.profile?.packPaidAt != null) "Ritual active" else if (state.canDecide) "Trial active" else "Inventory")
            if (!state.demo) OutlinedButton(enabled = !state.busy && !state.loading, onClick = { scope.launch { repo.refresh() } }) { Text("Refresh account access") }
        }
        if (!state.demo) ReminderSetting(state.tools, state.user?.id, state.canDecide)
        Panel {
            Text("About RiteStack", style = MaterialTheme.typography.titleLarge)
            Text("Keep, cut, or pause the tools you pay for. You enter your stack; RiteStack never scans your inbox or connects to your bank.")
            Text("Marking a tool cut or paused only records your decision. You must manage the actual subscription with its provider.")
            WebLink("Privacy policy", "https://ritestack.app/mobile/privacy")
            WebLink("Terms", "https://ritestack.app/mobile/terms")
            WebLink("Support", "https://ritestack.app/mobile/support")
            WebLink("Contact support / send feedback", "mailto:hello@ritestack.app?subject=RiteStack%20Android%20feedback")
            Text("Version 1.0.0 (1)", style = MaterialTheme.typography.bodySmall)
        }
        OutlinedButton(enabled = !state.busy, onClick = { signingOut = true }) { Text(if (state.demo) "Exit sample stack" else "Sign out") }
        if (!state.demo) TextButton(enabled = !state.busy, onClick = { deleting = true; confirmation = "" }) { Text("Delete account", color = MaterialTheme.colorScheme.error) }
    }
    if (signingOut) AlertDialog(onDismissRequest = { signingOut = false }, title = { Text(if (state.demo) "Exit sample stack?" else "Sign out?") }, dismissButton = { TextButton(onClick = { signingOut = false }) { Text("Cancel") } }, confirmButton = { TextButton(modifier = Modifier.testTag("confirmSignOut"), onClick = { signingOut = false; scope.launch { repo.signOut() } }) { Text("Confirm") } })
    if (deleting) AlertDialog(onDismissRequest = { if (!state.busy) deleting = false }, title = { Text("Delete your RiteStack account?") }, text = { Column(Modifier.verticalScroll(rememberScrollState()), verticalArrangement = Arrangement.spacedBy(12.dp)) { Text("This permanently removes your account, inventory, cut receipts, and access profile across all RiteStack apps and the website. This cannot be undone. It does not cancel subscriptions with other providers or automatically refund payments. Legally required payment records may be retained by the payment processor."); OutlinedTextField(confirmation, { confirmation = it }, label = { Text("Type DELETE to confirm") }, singleLine = true); if (state.busy) LinearProgressIndicator(Modifier.fillMaxWidth()) } }, dismissButton = { TextButton(enabled = !state.busy, onClick = { deleting = false }) { Text("Cancel") } }, confirmButton = { TextButton(enabled = confirmation == "DELETE" && !state.busy, onClick = { scope.launch { if (repo.deleteAccount()) deleting = false } }) { Text("Permanently delete") } })
}
