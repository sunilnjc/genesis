import XCTest
@testable import RiteStack

final class RitualTests: XCTestCase {
    let user = UUID()
    func tool(_ date: String, decision: Decision = .undecided, reminder: String? = nil) -> Tool {
        Tool(userID: user, name: date, monthlyCost: 20, renewDate: date, decision: decision, remindAt: reminder)
    }
    func testWallInclusiveAndCutExcluded() {
        let today = "2026-12-25"
        let rows = [tool(today), tool("2027-01-08"), tool("2027-01-09"), tool("2026-12-24"), tool(today, decision: .cut)]
        XCTAssertEqual(Tool.wall(rows, today: today).map(\.renewDate), [today, "2027-01-08"])
    }
    func testPauseReminderAndRenewalIndependentlyQualify() {
        let rows = [tool("2026-10-29", decision: .pause, reminder: "2026-10-02"), tool("2026-10-05", decision: .pause, reminder: "2026-11-01")]
        XCTAssertEqual(Tool.wall(rows, today: "2026-10-01").count, 2)
    }
    func testDateArithmeticAcrossLeapAndDST() {
        XCTAssertEqual(Day.add(1, to: "2028-02-28"), "2028-02-29")
        XCTAssertEqual(Day.add(14, to: "2026-03-01"), "2026-03-15")
        XCTAssertEqual(Day.add(30, to: "2026-12-15"), "2027-01-14")
    }
    func testDecisionsClearOldFieldsAndPreserveUnknownUsage() {
        let initial = tool("2026-10-01")
        let paused = initial.deciding(.pause, today: "2026-09-27")
        XCTAssertEqual(paused.remindAt, "2026-10-27")
        XCTAssertNil(paused.lastUsed)
        let cut = paused.deciding(.cut, today: "2026-09-28")
        XCTAssertNil(cut.remindAt); XCTAssertEqual(cut.cutAt, "2026-09-28")
        let keep = cut.deciding(.keep, today: "2026-09-29")
        XCTAssertNil(keep.cutAt); XCTAssertNil(keep.remindAt)
    }
    func testAllDecideRetainsWebSemantics() {
        XCTAssertTrue(tool("2027-01-01").needsDecision(today: "2026-10-01"))
        XCTAssertFalse(tool("2027-01-01", decision: .keep).needsDecision(today: "2026-10-01"))
        XCTAssertTrue(tool("2026-09-01", decision: .keep).needsDecision(today: "2026-10-01"))
        XCTAssertFalse(tool("2026-10-02", decision: .pause, reminder: "2026-11-01").needsDecision(today: "2026-10-01"))
        XCTAssertTrue(tool("2027-01-01", decision: .pause, reminder: "2026-09-30").needsDecision(today: "2026-10-01"))
    }
    func testURLSafetyAndValidation() {
        XCTAssertNil(Tool.safeURL("javascript:alert(1)"))
        XCTAssertNil(Tool.safeURL("https://user:secret@example.com"))
        XCTAssertNotNil(Tool.safeURL("https://example.com/billing"))
        XCTAssertNotNil(Tool.validate(name: "", cost: "20", cancelURL: ""))
        for bad in ["-1", "NaN", "1e3", "10001", "1.234", "20oops"] { XCTAssertNotNil(Tool.validate(name: "Tool", cost: bad, cancelURL: "")) }
        XCTAssertNil(Tool.validate(name: "Tool", cost: "20.50", cancelURL: ""))
    }
    func testEntitlementFailsClosedAndTrialBoundary() {
        let now = ISO8601DateFormatter().date(from: "2026-09-27T12:00:00Z")!
        XCTAssertFalse(Profile(trialEndsAt: "invalid", packPaidAt: nil).allowsRitual(now: now))
        XCTAssertFalse(Profile(trialEndsAt: "2026-09-27T12:00:00Z", packPaidAt: nil).allowsRitual(now: now))
        XCTAssertTrue(Profile(trialEndsAt: "2026-09-27T12:00:01.000Z", packPaidAt: nil).allowsRitual(now: now))
        XCTAssertTrue(Profile(trialEndsAt: "invalid", packPaidAt: "2026-09-20").allowsRitual(now: now))
    }
    func testDatabaseRoundTrip() throws {
        let original = tool("2026-10-01", decision: .pause, reminder: "2026-10-10")
        let data = try JSONEncoder().encode(original)
        XCTAssertEqual(try JSONDecoder().decode(Tool.self, from: data), original)
        let json = try XCTUnwrap(JSONSerialization.jsonObject(with: data) as? [String: Any])
        XCTAssertNotNil(json["user_id"]); XCTAssertNotNil(json["monthly_cost"])
    }
    @MainActor func testDemoBurnIncludesPauseExcludesCutsAndSignOutClears() async {
        let store = AppStore(); store.startDemo()
        XCTAssertEqual(store.monthlyBurn, 55); XCTAssertEqual(store.cutAmount, 12)
        XCTAssertEqual(store.cuts.count, 1)
        await store.signOut()
        XCTAssertTrue(store.tools.isEmpty); XCTAssertFalse(store.signedIn); XCTAssertFalse(store.canDecide)
    }
}
