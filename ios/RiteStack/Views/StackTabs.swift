import SwiftUI

struct StackTabs: View {
    var body: some View {
        TabView {
            ToolListView(mode: .decide).tabItem { Label("Decide", systemImage: "checkmark.circle") }
            ToolListView(mode: .inventory).tabItem { Label("Inventory", systemImage: "square.stack.3d.up") }
            ToolListView(mode: .cuts).tabItem { Label("Cuts", systemImage: "scissors") }
            AccountView().tabItem { Label("Account", systemImage: "person.crop.circle") }
        }
    }
}
enum ListMode: String { case decide = "Decide", inventory = "Inventory", cuts = "Cuts" }
struct ToolListView: View {
    @Environment(AppStore.self) private var store
    let mode: ListMode
    @State private var next14 = true
    @State private var search = ""
    @State private var add = false
    @State private var edit: Tool?
    @State private var remove: Tool?
    @State private var cut: Tool?
    var rows: [Tool] {
        var rows: [Tool]
        switch mode {
        case .decide:
            rows = next14 ? Tool.wall(store.tools, today: Day.string()) : store.tools.filter { $0.needsDecision(today: Day.string()) }.sorted { $0.renewDate < $1.renewDate }
        case .inventory: rows = store.tools.sorted { $0.name.localizedCaseInsensitiveCompare($1.name) == .orderedAscending }
        case .cuts: rows = store.cuts
        }
        return rows.filter { search.isEmpty || $0.name.localizedCaseInsensitiveContains(search) || $0.category.localizedCaseInsensitiveContains(search) }
    }
    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(alignment: .leading, spacing: 18) {
                    if store.demo {
                        Label("Sample stack · changes stay in this preview", systemImage: "sparkles").font(.caption).foregroundStyle(Brand.gold)
                    }
                    summary
                    if mode == .decide {
                        Toggle("Next 14 days", isOn: $next14).tint(Brand.gold)
                        Text(next14 ? "Renewals and pause reminders, today through day 14." : "All tools that need a decision.").font(.caption).foregroundStyle(.secondary)
                        if !store.canDecide && !store.loading {
                            Panel { VStack(alignment: .leading, spacing: 8) {
                                Text("Your inventory stays free").font(.headline)
                                Text("Ritual access isn’t active on this account. You can still view and edit your tools and read your cut receipts.").font(.subheadline).foregroundStyle(.secondary)
                            } }
                        }
                    }
                    if store.loading { ProgressView("Syncing your stack…").frame(maxWidth: .infinity) }
                    if store.error != nil {
                        Button("Retry sync") { Task { await store.refresh() } }.buttonStyle(.bordered)
                    }
                    if rows.isEmpty && !store.loading {
                        ContentUnavailableView(search.isEmpty ? emptyTitle : "No matching tools", systemImage: mode == .cuts ? "scissors" : "square.stack.3d.up", description: Text(emptyDetail))
                        if mode == .inventory && search.isEmpty { Button("Add your first tool") { add = true }.buttonStyle(.borderedProminent) }
                    }
                    ForEach(rows) { tool in
                        ToolCard(tool: tool, mode: mode, edit: { edit = tool }, remove: { remove = tool }, cut: { cut = tool })
                    }
                    Text("Pull to refresh · amounts in USD").font(.caption2).foregroundStyle(.secondary).frame(maxWidth: .infinity).padding(.top)
                }.padding(20).frame(maxWidth: 760)
            }.frame(maxWidth: .infinity).background(Brand.background)
                .navigationTitle(mode.rawValue)
                .searchable(text: $search, prompt: "Find a tool")
                .refreshable { await store.refresh() }
                .toolbar { if mode != .cuts { Button { add = true } label: { Image(systemName: "plus") }.accessibilityLabel("Add tool").accessibilityIdentifier("addTool").disabled(store.busy || store.loading) } }
                .sheet(isPresented: $add) { ToolEditor() }
                .sheet(item: $edit) { ToolEditor(existing: $0) }
                .confirmationDialog("Remove this tool?", isPresented: Binding(get: { remove != nil }, set: { if !$0 { remove = nil } }), titleVisibility: .visible) {
                    Button("Remove tool", role: .destructive) { if let tool = remove { Task { await store.remove(tool) } }; remove = nil }
                } message: { Text("This deletes the inventory entry. It does not cancel the subscription with its provider.") }
                .confirmationDialog("Record this cut?", isPresented: Binding(get: { cut != nil }, set: { if !$0 { cut = nil } }), titleVisibility: .visible) {
                    Button("Record cut", role: .destructive) { if let tool = cut { Task { await store.decide(tool, .cut) } }; cut = nil }
                } message: { Text("RiteStack records your decision. Complete cancellation on the provider’s site. The billing link will remain in Cuts.") }
        }
    }
    var summary: some View {
        Panel {
            VStack(alignment: .leading, spacing: 8) {
                Text(mode == .cuts ? "RECORDED CUTS" : "MONTHLY STACK").font(.caption.weight(.semibold)).tracking(2).foregroundStyle(Brand.gold)
                Text((mode == .cuts ? store.cutAmount : store.monthlyBurn).formatted(.currency(code: "USD"))).font(.system(.largeTitle, design: .serif)).foregroundStyle(Brand.cream)
                Text(mode == .cuts ? "Monthly value of tools marked cut—not verified savings." : "\(store.tools.filter { $0.decision != .cut }.count) active tools · paused tools still count").font(.caption).foregroundStyle(.secondary)
            }
        }
    }
    var emptyTitle: String {
        switch mode { case .decide: return next14 ? "Nothing renews in 14 days" : "Nothing needs a decision"
        case .inventory: return "Start with the tools you pay for"
        case .cuts: return "Nothing cut yet" }
    }
    var emptyDetail: String {
        if !search.isEmpty { return "Try a different name or category." }
        switch mode { case .decide: return "Your full stack is always in Inventory."
        case .inventory: return "Add a name, monthly amount, and next renewal date."
        case .cuts: return "When you cut, it lands here." }
    }
}
struct ToolCard: View {
    @Environment(AppStore.self) private var store
    let tool: Tool
    let mode: ListMode
    let edit: () -> Void
    let remove: () -> Void
    let cut: () -> Void
    var body: some View {
        Panel {
            VStack(alignment: .leading, spacing: 16) {
                HStack(alignment: .top) {
                    Text(String(tool.name.prefix(1)).uppercased()).font(.title2.weight(.medium)).frame(width: 44, height: 44).background(Brand.gold.opacity(0.12), in: RoundedRectangle(cornerRadius: 12)).foregroundStyle(Brand.gold).accessibilityHidden(true)
                    VStack(alignment: .leading, spacing: 4) {
                        Text(tool.name).font(.headline)
                        Text(tool.category + (tool.isSample ? " · Sample" : "")).font(.caption).foregroundStyle(.secondary)
                    }
                    Spacer()
                    Text(tool.money).font(.headline).monospacedDigit()
                }
                HStack {
                    Text(tool.decision.title).font(.caption.weight(.semibold)).padding(.horizontal, 10).padding(.vertical, 5).background(.white.opacity(0.06), in: Capsule())
                    Spacer()
                    Text(mode == .cuts ? tool.cutAt.map { "Cut \(Day.display($0))" } ?? "Cut date unknown" : "Renews \(Day.display(tool.renewDate))").font(.caption).foregroundStyle(.secondary)
                }
                if mode != .cuts {
                    Text("Last used: \(tool.lastUsed.map(Day.display) ?? "Unknown")").font(.caption).foregroundStyle(.secondary)
                    if tool.decision == .pause, let day = tool.remindAt { Label("Review \(Day.display(day))", systemImage: "bell").font(.caption).foregroundStyle(Brand.gold) }
                }
                if let url = tool.safeCancelURL, mode == .cuts || store.canDecide {
                    Link(destination: url) { Label("Open provider billing", systemImage: "arrow.up.right.square").font(.subheadline) }
                }
                if mode == .decide {
                    ViewThatFits(in: .horizontal) {
                        HStack { decisions }
                        VStack(alignment: .leading) { decisions }
                    }.disabled(!store.canDecide || store.busy || store.loading)
                }
                if mode == .inventory {
                    HStack {
                        Button("Edit", action: edit).buttonStyle(.bordered)
                        if tool.decision == .pause && store.canDecide { Button("Unpause") { Task { await store.decide(tool, .undecided) } }.buttonStyle(.bordered) }
                        Spacer()
                        Button(role: .destructive, action: remove) { Image(systemName: "trash") }.accessibilityLabel("Remove \(tool.name)").frame(minWidth: 44, minHeight: 44)
                    }.disabled(store.busy || store.loading)
                }
            }
        }
    }
    @ViewBuilder var decisions: some View {
        Button { Task { await store.decide(tool, .keep) } } label: { Label("Keep", systemImage: "checkmark") }.buttonStyle(.bordered)
        Button(action: cut) { Label("Cut", systemImage: "scissors") }.buttonStyle(.bordered)
        Button { Task { await store.decide(tool, tool.decision == .pause ? .undecided : .pause) } } label: {
            Label(tool.decision == .pause ? "Unpause" : "Pause", systemImage: tool.decision == .pause ? "play" : "pause")
        }.buttonStyle(.bordered)
    }
}
