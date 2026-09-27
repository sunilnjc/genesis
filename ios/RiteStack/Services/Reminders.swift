import Foundation
import UserNotifications

@MainActor final class Reminders {
    private var generation = 0
    private let center = UNUserNotificationCenter.current()
    func enable() async throws -> Bool { try await center.requestAuthorization(options: [.alert, .sound, .badge]) }
    func clear() { generation += 1; center.removeAllPendingNotificationRequests(); center.removeAllDeliveredNotifications() }
    func sync(tools: [Tool], allowed: Bool) async {
        clear()
        let revision = generation
        let settings = await center.notificationSettings()
        guard revision == generation, allowed, [.authorized, .provisional].contains(settings.authorizationStatus) else { return }
        let candidates = tools.filter { $0.decision != .cut }.flatMap { tool -> [(Tool, String, String)] in
            var dates = [(tool, tool.renewDate, "Renewal review")]
            if tool.decision == .pause, let day = tool.remindAt { dates.append((tool, day, "Pause reminder")) }
            return dates
        }.sorted { $0.1 < $1.1 }
        // iOS limits pending local notifications. Schedule the nearest 60, refresh on foreground.
        var count = 0
        for (tool, day, title) in candidates {
            guard revision == generation else { return }
            let parts = day.split(separator: "-").compactMap { Int($0) }
            guard parts.count == 3 else { continue }
            let components = DateComponents(year: parts[0], month: parts[1], day: parts[2], hour: 9)
            guard let fire = Calendar.current.date(from: components), fire > Date(), count < 60 else { continue }
            let content = UNMutableNotificationContent()
            content.title = title
            content.body = "Open RiteStack to review your tools."
            content.sound = .default
            let request = UNNotificationRequest(identifier: "\(tool.id)-\(title)", content: content, trigger: UNCalendarNotificationTrigger(dateMatching: components, repeats: false))
            try? await center.add(request); count += 1
        }
    }
}
