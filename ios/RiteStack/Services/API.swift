import Foundation

struct AuthUser: Codable { var id: UUID; var email: String? }
struct Session: Codable {
    var access_token: String
    var refresh_token: String
    var expires_at: Double?
    var expires_in: Double?
    var user: AuthUser
}
enum APIError: LocalizedError {
    case message(String), signedOut
    var errorDescription: String? {
        switch self { case .message(let text): return text; case .signedOut: return "Your session has expired. Sign in again." }
    }
}
@MainActor final class API {
    private(set) var session: Session?
    private var refreshTask: Task<Session, Error>?
    private var generation = 0
    private let network: URLSession
    init() {
        let c = URLSessionConfiguration.ephemeral; c.timeoutIntervalForRequest = 25; c.timeoutIntervalForResource = 45
        network = URLSession(configuration: c)
    }
    func restore() throws { if let data = try Keychain.load() { session = try JSONDecoder().decode(Session.self, from: data) } }
    private func accept(_ incoming: Session) throws {
        var s = incoming
        if s.expires_at == nil { s.expires_at = Date().timeIntervalSince1970 + (s.expires_in ?? 3600) }
        try Keychain.save(JSONEncoder().encode(s)); session = s
    }
    func clear() { generation += 1; refreshTask?.cancel(); refreshTask = nil; session = nil; Keychain.clear() }
    func requestCode(email: String) async throws {
        _ = try await send(path: "/auth/v1/otp", method: "POST", body: ["email": email, "create_user": true], token: nil)
    }
    func verify(email: String, code: String) async throws {
        let data = try await send(path: "/auth/v1/verify", method: "POST", body: ["email": email, "token": code, "type": "email"], token: nil)
        try accept(JSONDecoder().decode(Session.self, from: data))
    }
    func accessToken() async throws -> String {
        guard let s = session else { throw APIError.signedOut }
        if (s.expires_at ?? 0) > Date().timeIntervalSince1970 + 60 { return s.access_token }
        if let refreshTask { return try await refreshTask.value.access_token }
        let revision = generation
        let task = Task { () throws -> Session in
            let data = try await send(path: "/auth/v1/token?grant_type=refresh_token", method: "POST", body: ["refresh_token": s.refresh_token], token: nil)
            let value = try JSONDecoder().decode(Session.self, from: data)
            guard revision == generation else { throw CancellationError() }
            try accept(value); return session!
        }
        refreshTask = task
        defer { refreshTask = nil }
        do { return try await task.value.access_token }
        catch APIError.signedOut { clear(); throw APIError.signedOut }
    }
    func tools() async throws -> [Tool] {
        let token = try await accessToken()
        guard let user = session?.user.id else { throw APIError.signedOut }
        return try JSONDecoder().decode([Tool].self, from: await send(path: "/rest/v1/subscriptions?user_id=eq.\(user)&select=*&order=created_at.asc", token: token))
    }
    func profile() async throws -> Profile {
        let token = try await accessToken()
        let data = try await send(path: "/rest/v1/rpc/ensure_own_profile", method: "POST", body: [:], token: token)
        if let row = try? JSONDecoder().decode(Profile.self, from: data) { return row }
        guard let row = try JSONDecoder().decode([Profile].self, from: data).first else { throw APIError.message("Could not load account access.") }
        return row
    }
    func save(_ tool: Tool, isNew: Bool) async throws -> Tool {
        let token = try await accessToken()
        guard session?.user.id == tool.userID else { throw APIError.signedOut }
        var body = try JSONSerialization.jsonObject(with: JSONEncoder().encode(tool)) as! [String: Any]
        for key in ["last_used", "remind_at", "cut_at"] where body[key] == nil { body[key] = NSNull() }
        let path = isNew ? "/rest/v1/subscriptions" : "/rest/v1/subscriptions?id=eq.\(tool.id)&user_id=eq.\(tool.userID)"
        let data = try await send(path: path, method: isNew ? "POST" : "PATCH", body: body, token: token, prefer: "return=representation")
        guard let saved = try JSONDecoder().decode([Tool].self, from: data).first else { throw APIError.message("This tool no longer exists. Refresh your stack.") }
        return saved
    }
    func delete(_ tool: Tool) async throws {
        let token = try await accessToken()
        guard session?.user.id == tool.userID else { throw APIError.signedOut }
        _ = try await send(path: "/rest/v1/subscriptions?id=eq.\(tool.id)&user_id=eq.\(tool.userID)", method: "DELETE", token: token)
    }
    func deleteAccount() async throws {
        let token = try await accessToken()
        var request = URLRequest(url: URL(string: "https://ritestack.app/api/account")!)
        request.httpMethod = "DELETE"
        request.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
        request.setValue("delete-account", forHTTPHeaderField: "X-RiteStack-Confirm")
        let (_, response) = try await network.data(for: request)
        guard (response as? HTTPURLResponse)?.statusCode == 200 else {
            throw APIError.message("Account deletion could not complete. Please retry or contact hello@ritestack.app.")
        }
        clear()
    }
    func signOut() async {
        let token = session?.access_token; clear()
        if let token { _ = try? await send(path: "/auth/v1/logout?scope=local", method: "POST", token: token) }
    }
    private func send(path: String, method: String = "GET", body: [String: Any]? = nil, token: String?, prefer: String? = nil) async throws -> Data {
        guard let url = URL(string: AppConfig.supabaseURL + path) else { throw APIError.message("Invalid service configuration.") }
        var request = URLRequest(url: url); request.httpMethod = method
        request.setValue(AppConfig.anonKey, forHTTPHeaderField: "apikey")
        if let token { request.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization") }
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        if let prefer { request.setValue(prefer, forHTTPHeaderField: "Prefer") }
        if let body { request.httpBody = try JSONSerialization.data(withJSONObject: body) }
        let (data, response) = try await network.data(for: request)
        guard let response = response as? HTTPURLResponse else { throw APIError.message("The service did not respond. Try again.") }
        guard (200..<300).contains(response.statusCode) else {
            if response.statusCode == 401 || (path.contains("grant_type=refresh_token") && response.statusCode == 400) { throw APIError.signedOut }
            if response.statusCode == 429 { throw APIError.message("Too many attempts. Please wait a minute and try again.") }
            if path.contains("delete_own_account") { throw APIError.message("Account deletion could not complete. Please retry. Your account has not been removed.") }
            if path.contains("/verify") { throw APIError.message("That code is invalid or expired. Check your latest email or request a new code.") }
            throw APIError.message("Could not complete the request (\(response.statusCode)). Please try again.")
        }
        return data
    }
}
