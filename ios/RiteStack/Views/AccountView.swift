import SwiftUI

struct AccountView: View {
    @Environment(AppStore.self) private var store
    @State private var delete = false
    @State private var confirmation = ""
    @State private var signOut = false
    var body: some View {
        NavigationStack {
            Form {
                Section("Your account") {
                    Text(store.demo ? "Sample preview" : store.user?.email ?? "Signed in")
                    LabeledContent("Access", value: store.demo ? "Demo" : store.profile?.packPaidAt != nil ? "Ritual active" : store.canDecide ? "Trial active" : "Inventory")
                    if !store.demo, let last = store.lastSynced { LabeledContent("Last synced", value: last.formatted(date: .abbreviated, time: .shortened)) }
                    if !store.demo { Button("Refresh account access") { Task { await store.refresh() } }.disabled(store.busy || store.loading) }
                }
                if !store.demo {
                    Section {
                        Toggle("Local reminders", isOn: Binding(get: { store.remindersEnabled }, set: { enabled in
                            if enabled { Task { await store.enableReminders() } } else { store.disableReminders() }
                        })).disabled(!store.canDecide || store.busy)
                    } footer: { Text("Reminders appear at 9 AM on renewal and pause-review dates. The nearest 60 are scheduled when you open or refresh the app. Enable again after signing in. Notifications contain no tool names or amounts.") }
                }
                Section("About RiteStack") {
                    Text("Keep, cut, or pause the tools you pay for. You enter your stack; RiteStack never scans your inbox or connects to your bank.")
                    Text("Marking a tool cut or paused only records your decision. You must manage the actual subscription with its provider.")
                    Link("Privacy policy", destination: URL(string: "https://ritestack.app/privacy")!)
                    Link("Terms", destination: URL(string: "https://ritestack.app/terms")!)
                    Link("Contact support / send feedback", destination: URL(string: "mailto:hello@ritestack.app?subject=RiteStack%20iOS%20feedback")!)
                    LabeledContent("Version", value: "1.0.0 (1)")
                }
                Section {
                    Button(store.demo ? "Exit sample stack" : "Sign out", role: .destructive) { signOut = true }.disabled(store.busy)
                    if !store.demo { Button("Delete account", role: .destructive) { delete = true }.disabled(store.busy) }
                }
            }.navigationTitle("Account")
                .confirmationDialog(store.demo ? "Exit sample stack?" : "Sign out?", isPresented: $signOut, titleVisibility: .visible) {
                    Button(store.demo ? "Exit sample stack" : "Sign out", role: .destructive) { Task { await store.signOut() } }.accessibilityIdentifier("confirmSignOut")
                }
                .sheet(isPresented: $delete) {
                    NavigationStack {
                        Form {
                            Section {
                                Text("Delete your RiteStack account?").font(.title2.weight(.semibold))
                                Text("This permanently removes your account, inventory, cut receipts, and access profile across iOS and the website. This cannot be undone. It does not cancel any subscriptions with other providers or automatically refund payments. Legally required payment records may be retained by the payment processor.")
                                TextField("Type DELETE to confirm", text: $confirmation).autocorrectionDisabled().textInputAutocapitalization(.characters)
                                Button("Permanently delete account", role: .destructive) { Task { if await store.deleteAccount() { delete = false } } }.disabled(confirmation != "DELETE" || store.busy)
                                if store.busy { ProgressView("Deleting account…") }
                                if let error = store.error { Text(error).foregroundStyle(.red) }
                            }
                        }.navigationTitle("Delete account").navigationBarTitleDisplayMode(.inline)
                            .toolbar { Button("Cancel") { delete = false }.disabled(store.busy) }
                            .interactiveDismissDisabled(store.busy)
                    }
                }
        }
    }
}
