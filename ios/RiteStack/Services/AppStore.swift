import Foundation
import Observation

@MainActor @Observable final class AppStore {
    var tools: [Tool] = []
    var profile: Profile?
    var user: AuthUser?
    var demo = false
    var loading = true
    var busy = false
    var error: String?
    var lastSynced: Date?
    var remindersEnabled = false
    private let api = API()
    private let reminders = Reminders()
    private var revision = 0
    private var refreshing = false
    var signedIn: Bool { user != nil || demo }
    var canDecide: Bool { demo || (profile?.allowsRitual() ?? false) }
    var monthlyBurn: Decimal { tools.filter { $0.decision != .cut }.reduce(0) { $0 + $1.monthlyCost } }
    var cutAmount: Decimal { tools.filter { $0.decision == .cut }.reduce(0) { $0 + $1.monthlyCost } }
    var cuts: [Tool] { tools.filter { $0.decision == .cut }.sorted { ($0.cutAt ?? "") > ($1.cutAt ?? "") } }
    var userID: UUID { user?.id ?? Self.demoID }
    static let demoID = UUID(uuidString: "00000000-0000-0000-0000-000000000001")!
    func start() async {
        defer { loading = false }
        do { try api.restore(); user = api.session?.user; if user != nil {
            remindersEnabled = (try Keychain.load(key: "reminders")).flatMap { String(data: $0, encoding: .utf8) } == user?.id.uuidString
            await refresh()
        } }
        catch { self.error = error.localizedDescription }
    }
    func requestCode(email: String) async -> Bool {
        await perform { try await self.api.requestCode(email: email) }
    }
    func verify(email: String, code: String) async -> Bool {
        let ok = await perform {
            try await self.api.verify(email: email, code: code)
            self.user = self.api.session?.user
        }
        if ok { await refresh() }
        return ok
    }
    func refresh() async {
        guard !demo, user != nil, !busy, !refreshing else { return }
        refreshing = true
        let rev = revision
        loading = true
        defer { loading = false; refreshing = false }
        do {
            let nextProfile = try await api.profile()
            let nextTools = try await api.tools()
            guard rev == revision else { return }
            profile = nextProfile; tools = nextTools; lastSynced = Date(); error = nil
            await updateReminders()
        } catch APIError.signedOut {
            await signOut(); error = APIError.signedOut.localizedDescription
        } catch { self.error = error.localizedDescription }
    }
    @discardableResult func save(_ tool: Tool, isNew: Bool) async -> Bool {
        await perform {
            let saved = self.demo ? tool : try await self.api.save(tool, isNew: isNew)
            if let index = self.tools.firstIndex(where: { $0.id == saved.id }) { self.tools[index] = saved }
            else { self.tools.append(saved) }
            await self.updateReminders()
        }
    }
    func decide(_ tool: Tool, _ decision: Decision) async {
        guard canDecide else { error = "Your account does not currently include ritual access. Inventory and cut receipts remain available."; return }
        _ = await save(tool.deciding(decision, today: Day.string()), isNew: false)
    }
    func remove(_ tool: Tool) async {
        await perform {
            if !self.demo { try await self.api.delete(tool) }
            self.tools.removeAll { $0.id == tool.id }
            await self.updateReminders()
        }
    }
    func deleteAccount() async -> Bool {
        guard !demo else { await signOut(); return true }
        let ok = await perform { try await self.api.deleteAccount() }
        if ok { await signOut() }
        return ok
    }
    func signOut() async {
        revision += 1; tools = []; profile = nil; user = nil; demo = false; lastSynced = nil
        remindersEnabled = false; Keychain.clear(key: "reminders"); reminders.clear()
        await api.signOut()
    }
    func startDemo() {
        revision += 1; demo = true; loading = false; error = nil
        tools = [
            Tool(userID: Self.demoID, name: "Cursor", monthlyCost: 20, renewDate: Day.add(3, to: Day.string()), isSample: true),
            Tool(userID: Self.demoID, name: "ChatGPT", monthlyCost: 20, renewDate: Day.add(8, to: Day.string()), isSample: true),
            Tool(userID: Self.demoID, name: "Design tool", monthlyCost: 15, renewDate: Day.add(21, to: Day.string()), category: "Design", decision: .pause, remindAt: Day.add(5, to: Day.string()), isSample: true),
            Tool(userID: Self.demoID, name: "Writing tool", monthlyCost: 12, renewDate: Day.string(), category: "Productivity", decision: .cut, isSample: true, cutAt: Day.add(-2, to: Day.string()))
        ]
    }
    func enableReminders() async {
        await perform {
            self.remindersEnabled = try await self.reminders.enable()
            if !self.remindersEnabled { throw APIError.message("Notifications are off. Enable them for RiteStack in iOS Settings.") }
            if let id = self.user?.id { try Keychain.save(Data(id.uuidString.utf8), key: "reminders") }
            await self.updateReminders()
        }
    }
    func disableReminders() { remindersEnabled = false; Keychain.clear(key: "reminders"); reminders.clear() }
    private func updateReminders() async {
        await reminders.sync(tools: tools, allowed: remindersEnabled && canDecide && !demo)
    }
    @discardableResult private func perform(_ action: () async throws -> Void) async -> Bool {
        guard !busy, !refreshing else { return false }
        busy = true; error = nil; defer { busy = false }
        do { try await action(); return true }
        catch APIError.signedOut { await signOut(); error = APIError.signedOut.localizedDescription; return false }
        catch { self.error = error.localizedDescription; return false }
    }
}
