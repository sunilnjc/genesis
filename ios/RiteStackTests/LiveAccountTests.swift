import XCTest
@testable import RiteStack

/// Optional live smoke test. Fixture contains two freshly generated, disposable accounts only.
/// Never bundle this fixture into the app target or commit its one-time codes.
final class LiveAccountTests: XCTestCase {
    struct Fixture: Decodable { var email: String; var code: String }
    @MainActor func testLiveOwnershipLifecycleAndAccountDeletion() async throws {
        guard let url = Bundle(for: Self.self).url(forResource: "IntegrationFixture", withExtension: "json") else {
            throw XCTSkip("Generate disposable account fixtures to run the live integration test.")
        }
        let fixtures = try JSONDecoder().decode([Fixture].self, from: Data(contentsOf: url))
        XCTAssertEqual(fixtures.count, 2)
        let a = API(), b = API()
        try await a.verify(email: fixtures[0].email, code: fixtures[0].code)
        try await b.verify(email: fixtures[1].email, code: fixtures[1].code)
        let owner = try XCTUnwrap(a.session?.user.id)
        let other = try XCTUnwrap(b.session?.user.id)
        let profile = try await a.profile()
        XCTAssertTrue(profile.allowsRitual())
        let input = Tool(userID: owner, name: "iOS integration fixture", monthlyCost: Decimal(string: "9.50")!, renewDate: Day.string())
        let saved = try await a.save(input, isNew: true)
        XCTAssertEqual(saved.monthlyCost, Decimal(string: "9.50"))
        let privateRows = try await b.tools()
        XCTAssertFalse(privateRows.contains { $0.id == saved.id })
        var attack = saved; attack.userID = other; attack.name = "Ownership check"
        do { _ = try await b.save(attack, isNew: false); XCTFail("Cross-account write must not return a row") } catch { }
        let unchanged = try await a.tools()
        XCTAssertEqual(unchanged.first { $0.id == saved.id }?.name, input.name)
        let paused = try await a.save(saved.deciding(.pause, today: Day.string()), isNew: false)
        XCTAssertNotNil(paused.remindAt)
        let kept = try await a.save(paused.deciding(.keep, today: Day.string()), isNew: false)
        XCTAssertNil(kept.remindAt); XCTAssertNil(kept.cutAt)
        let token = try await a.accessToken()
        try await a.deleteAccount()
        XCTAssertNil(a.session)
        var check = URLRequest(url: URL(string: AppConfig.supabaseURL + "/auth/v1/user")!)
        check.setValue(AppConfig.anonKey, forHTTPHeaderField: "apikey")
        check.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
        let (_, response) = try await URLSession.shared.data(for: check)
        XCTAssertTrue([401, 403].contains((response as? HTTPURLResponse)?.statusCode ?? 0))
        try await b.deleteAccount()
        XCTAssertNil(b.session)
    }
}
