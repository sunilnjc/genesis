import Foundation
import Security

enum Keychain {
    private static func query(_ key: String) -> [String: Any] { [kSecClass as String: kSecClassGenericPassword, kSecAttrService as String: "app.ritestack.ios.session", kSecAttrAccount as String: key] }
    static func save(_ data: Data, key: String = "session") throws {
        let query = query(key)
        let values: [String: Any] = [kSecValueData as String: data, kSecAttrAccessible as String: kSecAttrAccessibleWhenUnlockedThisDeviceOnly]
        let status = SecItemUpdate(query as CFDictionary, values as CFDictionary)
        if status == errSecItemNotFound {
            guard SecItemAdd(query.merging(values) { _, b in b } as CFDictionary, nil) == errSecSuccess else { throw APIError.message("Could not securely save your session.") }
        } else if status != errSecSuccess { throw APIError.message("Could not securely save your session.") }
    }
    static func load(key: String = "session") throws -> Data? {
        var q = query(key); q[kSecReturnData as String] = true; q[kSecMatchLimit as String] = kSecMatchLimitOne
        var result: CFTypeRef?
        let status = SecItemCopyMatching(q as CFDictionary, &result)
        if status == errSecItemNotFound { return nil }
        guard status == errSecSuccess else { throw APIError.message("Unlock your device and retry to access your saved session.") }
        return result as? Data
    }
    static func clear(key: String = "session") { SecItemDelete(query(key) as CFDictionary) }
}
