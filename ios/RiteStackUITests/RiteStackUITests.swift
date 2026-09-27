import XCTest

final class RiteStackUITests: XCTestCase {
    func testSampleJourney() throws {
        let app = XCUIApplication(); app.launch()
        let demo = app.buttons["demo"]
        XCTAssertTrue(demo.waitForExistence(timeout: 15)); demo.tap()
        XCTAssertTrue(app.navigationBars["Decide"].waitForExistence(timeout: 5))
        XCTAssertTrue(app.staticTexts["Cursor"].exists)
        capture(app, "01-Decide")
        selectTab(app, "Inventory")
        capture(app, "02-Inventory")
        app.buttons["addTool"].tap()
        let name = app.textFields["toolName"]
        XCTAssertTrue(name.waitForExistence(timeout: 5)); name.tap(); name.typeText("QA Tool")
        let cost = app.textFields["toolCost"]; cost.tap(); cost.typeText("9.50")
        app.buttons["saveTool"].tap()
        XCTAssertTrue(app.staticTexts["QA Tool"].waitForExistence(timeout: 5))
        selectTab(app, "Cuts")
        XCTAssertTrue(app.staticTexts["Writing tool"].waitForExistence(timeout: 5))
        capture(app, "03-Cuts")
        selectTab(app, "Account")
        app.buttons["Exit sample stack"].tap()
        let confirm = app.buttons["confirmSignOut"].firstMatch
        XCTAssertTrue(confirm.waitForExistence(timeout: 5)); confirm.tap()
        XCTAssertTrue(app.buttons["demo"].waitForExistence(timeout: 5))
    }
    func testPauseUnpauseAndCut() {
        let app = XCUIApplication(); app.launch()
        XCTAssertTrue(app.buttons["demo"].waitForExistence(timeout: 15)); app.buttons["demo"].tap()
        XCTAssertTrue(app.buttons["Pause"].firstMatch.waitForExistence(timeout: 5))
        app.buttons["Pause"].firstMatch.tap()
        XCTAssertTrue(app.buttons["Unpause"].firstMatch.waitForExistence(timeout: 5))
        app.buttons["Unpause"].firstMatch.tap()
        app.buttons["Cut"].firstMatch.tap()
        XCTAssertTrue(app.buttons["Record cut"].waitForExistence(timeout: 5)); app.buttons["Record cut"].tap()
        selectTab(app, "Cuts")
        XCTAssertTrue(app.staticTexts["Cursor"].waitForExistence(timeout: 5))
        XCTAssertTrue(app.staticTexts["Writing tool"].exists)
    }
    private func selectTab(_ app: XCUIApplication, _ name: String) {
        // iPadOS exposes floating tabs as cells; iPhone exposes tab-bar buttons.
        let tab = app.descendants(matching: .any).matching(identifier: name).firstMatch
        XCTAssertTrue(tab.waitForExistence(timeout: 5)); tab.tap()
    }
    private func capture(_ app: XCUIApplication, _ name: String) {
        let shot = XCTAttachment(screenshot: app.screenshot()); shot.name = name; shot.lifetime = .keepAlways; add(shot)
    }
    func testInvalidAmountDoesNotSave() {
        let app = XCUIApplication(); app.launch()
        XCTAssertTrue(app.buttons["demo"].waitForExistence(timeout: 15)); app.buttons["demo"].tap()
        app.buttons["addTool"].tap()
        app.textFields["toolName"].tap(); app.textFields["toolName"].typeText("Invalid tool")
        app.buttons["saveTool"].tap()
        XCTAssertTrue(app.staticTexts["formError"].waitForExistence(timeout: 5))
        XCTAssertTrue(app.navigationBars["Add tool"].exists)
    }
}
