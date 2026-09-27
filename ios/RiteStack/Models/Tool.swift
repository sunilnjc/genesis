import Foundation

enum Decision: String, Codable, CaseIterable {
    case undecided, keep, cut, pause
    var title: String { rawValue.capitalized }
}

struct Tool: Codable, Identifiable, Equatable {
    var id = UUID()
    var userID: UUID
    var name: String
    var monthlyCost: Decimal
    var renewDate: String
    var category = "AI"
    var cancelURL = ""
    var lastUsed: String?
    var decision: Decision = .undecided
    var remindAt: String?
    var isSample = false
    var cutAt: String?
    var createdAt = ISO8601DateFormatter().string(from: Date())
    var updatedAt = ISO8601DateFormatter().string(from: Date())

    enum CodingKeys: String, CodingKey {
        case id, name, category, decision
        case userID = "user_id", monthlyCost = "monthly_cost", renewDate = "renew_date"
        case cancelURL = "cancel_url", lastUsed = "last_used", remindAt = "remind_at"
        case isSample = "is_sample", cutAt = "cut_at", createdAt = "created_at", updatedAt = "updated_at"
    }
    static let categories = ["AI", "Dev tools", "Hosting", "Design", "Productivity", "Domains", "Other"]
    var money: String { monthlyCost.formatted(.currency(code: "USD")) }
    var safeCancelURL: URL? { Self.safeURL(cancelURL) }
    static func safeURL(_ raw: String) -> URL? {
        guard let url = URL(string: raw), ["https", "http"].contains(url.scheme?.lowercased() ?? ""),
              let host = url.host, !host.isEmpty, url.user == nil, url.password == nil else { return nil }
        return url
    }
    func deciding(_ decision: Decision, today: String) -> Tool {
        var next = self
        next.decision = decision
        next.remindAt = decision == .pause ? Day.add(30, to: today) : nil
        next.cutAt = decision == .cut ? today : nil
        next.updatedAt = ISO8601DateFormatter().string(from: Date())
        return next
    }
    func needsDecision(today: String) -> Bool {
        if decision == .cut { return false }
        if decision == .undecided { return true }
        if decision == .pause { return remindAt.map { $0 <= today } ?? false }
        return renewDate <= Day.add(14, to: today)
    }
    static func wall(_ tools: [Tool], today: String) -> [Tool] {
        let end = Day.add(14, to: today)
        func inWindow(_ day: String?) -> Bool { day.map { $0 >= today && $0 <= end } ?? false }
        func nextDate(_ tool: Tool) -> String {
            let renewal = inWindow(tool.renewDate) ? tool.renewDate : end
            if tool.decision == .pause, let reminder = tool.remindAt, inWindow(reminder) { return min(renewal, reminder) }
            return renewal
        }
        return tools.filter { $0.decision != .cut && (inWindow($0.renewDate) || ($0.decision == .pause && inWindow($0.remindAt))) }
            .sorted { nextDate($0) == nextDate($1) ? $0.name < $1.name : nextDate($0) < nextDate($1) }
    }
    static func validate(name: String, cost: String, cancelURL: String) -> String? {
        if name.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty { return "Enter the tool name." }
        if name.count > 80 { return "Keep the name to 80 characters or fewer." }
        guard let amount = Decimal(string: cost, locale: Locale(identifier: "en_US_POSIX")), amount >= 0, amount <= 10000,
              cost.range(of: #"^\d+(\.\d{1,2})?$"#, options: .regularExpression) != nil else {
            return "Enter a monthly amount from 0 to 10,000, with up to two decimal places."
        }
        if !cancelURL.isEmpty && safeURL(cancelURL) == nil { return "Enter a valid http or https billing URL." }
        return nil
    }
}

enum Day {
    static var calendar: Calendar {
        var calendar = Calendar(identifier: .gregorian)
        calendar.timeZone = TimeZone(secondsFromGMT: 0)!
        return calendar
    }
    static func string(_ date: Date = Date()) -> String {
        let f = DateFormatter(); f.calendar = Calendar(identifier: .gregorian)
        f.locale = Locale(identifier: "en_US_POSIX"); f.dateFormat = "yyyy-MM-dd"
        return f.string(from: date)
    }
    static func date(_ string: String) -> Date {
        let f = DateFormatter(); f.calendar = calendar; f.timeZone = calendar.timeZone
        f.locale = Locale(identifier: "en_US_POSIX"); f.dateFormat = "yyyy-MM-dd"
        return f.date(from: string) ?? Date(timeIntervalSince1970: 0)
    }
    static func add(_ days: Int, to string: String) -> String {
        let d = calendar.date(byAdding: .day, value: days, to: date(string))!
        let f = DateFormatter(); f.calendar = calendar; f.timeZone = calendar.timeZone
        f.locale = Locale(identifier: "en_US_POSIX"); f.dateFormat = "yyyy-MM-dd"
        return f.string(from: d)
    }
    static func display(_ string: String) -> String {
        let f = DateFormatter(); f.timeZone = calendar.timeZone; f.dateStyle = .medium
        return f.string(from: date(string))
    }
    // DatePicker uses the user's local calendar; bridge date-only values at local noon.
    static func pickerDate(_ string: String) -> Date {
        let parts = string.split(separator: "-").compactMap { Int($0) }
        guard parts.count == 3 else { return Date() }
        return Calendar.current.date(from: DateComponents(year: parts[0], month: parts[1], day: parts[2], hour: 12)) ?? Date()
    }
}

struct Profile: Decodable {
    var trialEndsAt: String
    var packPaidAt: String?
    enum CodingKeys: String, CodingKey { case trialEndsAt = "trial_ends_at", packPaidAt = "pack_paid_at" }
    func allowsRitual(now: Date = Date()) -> Bool {
        if packPaidAt != nil { return true }
        let f = ISO8601DateFormatter(); f.formatOptions = [.withInternetDateTime, .withFractionalSeconds]
        let end = f.date(from: trialEndsAt) ?? ISO8601DateFormatter().date(from: trialEndsAt)
        return end.map { $0 > now } ?? false
    }
}
