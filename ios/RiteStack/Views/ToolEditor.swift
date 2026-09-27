import SwiftUI

struct ToolEditor: View {
    @Environment(AppStore.self) private var store
    @Environment(\.dismiss) private var dismiss
    var existing: Tool?
    @State private var name = ""
    @State private var cost = ""
    @State private var renewal = Date()
    @State private var category = "AI"
    @State private var cancelURL = ""
    @State private var unknown = true
    @State private var lastUsed = Date()
    @State private var validation: String?
    var body: some View {
        NavigationStack {
            Form {
                Section("The tool") {
                    TextField("Tool name", text: $name).accessibilityIdentifier("toolName")
                    if existing == nil && !name.isEmpty && cancelURL.isEmpty {
                        ForEach(Provider.matches(name), id: \.name) { provider in
                            Button { name = provider.name; cancelURL = provider.url } label: {
                                Label("Use \(provider.name) billing link", systemImage: "link").font(.caption)
                            }
                        }
                    }
                    TextField("Monthly amount (USD)", text: $cost).keyboardType(.decimalPad).accessibilityIdentifier("toolCost")
                    Picker("Category", selection: $category) { ForEach(Tool.categories, id: \.self) { Text($0) } }
                    DatePicker("Next renewal", selection: $renewal, displayedComponents: .date)
                }
                Section { Toggle("Last-used date unknown", isOn: $unknown)
                    if !unknown { DatePicker("Last used", selection: $lastUsed, in: ...Date(), displayedComponents: .date) }
                } footer: { Text("Use a date you know. RiteStack never guesses when you used a tool.") }
                Section {
                    TextField("https://provider.com/billing", text: $cancelURL).keyboardType(.URL).textInputAutocapitalization(.never).autocorrectionDisabled()
                } header: { Text("Provider billing link (optional)") } footer: { Text("Paste the provider’s billing or cancellation page. Adding a link does not cancel anything.") }
                if let validation { Section { Text(validation).foregroundStyle(.red).accessibilityIdentifier("formError") } }
                if store.busy { ProgressView("Saving…") }
            }.navigationTitle(existing == nil ? "Add tool" : "Edit tool").navigationBarTitleDisplayMode(.inline)
                .toolbar {
                    ToolbarItem(placement: .cancellationAction) { Button("Cancel") { dismiss() }.disabled(store.busy) }
                    ToolbarItem(placement: .confirmationAction) { Button("Save") { save() }.disabled(store.busy).accessibilityIdentifier("saveTool") }
                }.interactiveDismissDisabled(store.busy)
                .onAppear {
                    guard let row = existing else { return }
                    name = row.name; cost = NSDecimalNumber(decimal: row.monthlyCost).stringValue
                    renewal = Day.pickerDate(row.renewDate); category = row.category; cancelURL = row.cancelURL
                    unknown = row.lastUsed == nil; lastUsed = row.lastUsed.map(Day.pickerDate) ?? Date()
                }
        }
    }
    func save() {
        let cleanName = name.trimmingCharacters(in: .whitespacesAndNewlines)
        let cleanURL = cancelURL.trimmingCharacters(in: .whitespacesAndNewlines)
        let cleanCost = cost.trimmingCharacters(in: .whitespaces).replacingOccurrences(of: Locale.current.decimalSeparator ?? ".", with: ".")
        validation = Tool.validate(name: cleanName, cost: cleanCost, cancelURL: cleanURL)
        guard validation == nil, let amount = Decimal(string: cleanCost, locale: Locale(identifier: "en_US_POSIX")) else { return }
        var tool = existing ?? Tool(userID: store.userID, name: cleanName, monthlyCost: amount, renewDate: Day.string(renewal), isSample: store.demo)
        tool.name = cleanName; tool.monthlyCost = amount; tool.renewDate = Day.string(renewal)
        tool.category = category; tool.cancelURL = cleanURL; tool.lastUsed = unknown ? nil : Day.string(lastUsed)
        Task { if await store.save(tool, isNew: existing == nil) { dismiss() } else { validation = store.error ?? "Could not save. Try again." } }
    }
}

private struct Provider: Decodable {
    var name: String
    var aliases: [String]
    var url: String
    static let all: [Provider] = {
        guard let url = Bundle.main.url(forResource: "Providers", withExtension: "json"),
              let data = try? Data(contentsOf: url),
              let rows = try? JSONDecoder().decode([Provider].self, from: data) else { return [] }
        return rows
    }()
    static func matches(_ query: String) -> [Provider] {
        let clean = query.trimmingCharacters(in: .whitespacesAndNewlines)
        guard clean.count >= 2 else { return [] }
        return Array(all.filter { $0.name.localizedCaseInsensitiveContains(clean) || $0.aliases.contains { $0.localizedCaseInsensitiveContains(clean) } }.prefix(3))
    }
}
