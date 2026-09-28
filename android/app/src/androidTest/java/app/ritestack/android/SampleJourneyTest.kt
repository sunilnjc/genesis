package app.ritestack.android

import androidx.compose.ui.test.*
import androidx.compose.ui.test.junit4.createAndroidComposeRule
import android.graphics.Bitmap
import androidx.test.platform.app.InstrumentationRegistry
import java.io.File
import org.junit.Rule
import org.junit.Test

/** Exercises local preview only: never signs in or writes to production. */
class SampleJourneyTest {
    @get:Rule val compose = createAndroidComposeRule<MainActivity>()
    private fun preview() {
        compose.waitUntil(10_000) { compose.onAllNodesWithTag("demo").fetchSemanticsNodes().isNotEmpty() }
        compose.onNodeWithTag("demo").performScrollTo().performClick()
        compose.onNodeWithText("Sample stack · changes stay in this preview").assertExists()
    }
    @Test fun invalidAmountCannotCreateTool() {
        preview()
        compose.onNodeWithTag("tabInventory").performClick()
        compose.onNodeWithTag("addTool").performClick()
        compose.onNodeWithTag("toolName").performTextInput("Invalid amount QA")
        compose.onNodeWithTag("toolCost").performTextInput("-5")
        compose.onNodeWithTag("saveTool").performScrollTo().performClick()
        compose.onNodeWithTag("formError").assertExists()
    }
    @Test fun addToolAndExitPreview() {
        preview()
        compose.onNodeWithTag("tabInventory").performClick()
        compose.onNodeWithTag("addTool").performClick()
        compose.onNodeWithTag("toolName").performTextInput("AAA Preview QA")
        compose.onNodeWithTag("toolCost").performTextInput("12.50")
        compose.onNodeWithTag("saveTool").performScrollTo().performClick()
        compose.onNodeWithText("AAA Preview QA").assertExists()
        compose.onNodeWithTag("tabAccount").performClick()
        compose.onNodeWithText("Exit sample stack").performScrollTo().performClick()
        compose.onNodeWithTag("confirmSignOut").performClick()
        compose.onNodeWithTag("demo").assertExists()
        compose.onNodeWithTag("demo").performScrollTo().performClick()
        compose.onNodeWithTag("tabInventory").performClick()
        compose.onNodeWithText("AAA Preview QA").assertDoesNotExist()
    }
    @Test fun pauseUnpauseAndCutAreRecorded() {
        preview()
        compose.onNodeWithTag("toolList").performScrollToNode(hasTestTag("pause:Cursor"))
        compose.onNodeWithTag("pause:Cursor").performClick()
        compose.onNodeWithTag("pause:Cursor").assertTextContains("Unpause")
        compose.onNodeWithTag("pause:Cursor").performClick()
        compose.onNodeWithTag("pause:Cursor").assertTextContains("Pause")
        compose.onNodeWithTag("cut:Cursor").performClick()
        compose.onNodeWithText("Record cut").performClick()
        compose.onNodeWithTag("tabCuts").performClick()
        compose.onNodeWithTag("toolList").performScrollToNode(hasText("Cursor"))
        compose.onNodeWithText("Cursor").assertExists()
        compose.onNodeWithTag("tabDecide").performClick()
        compose.onNodeWithText("Cursor").assertDoesNotExist()
    }

    @Test fun captureStoreScreenshots() {
        preview()
        val instrumentation = InstrumentationRegistry.getInstrumentation()
        val directory = File(instrumentation.targetContext.getExternalFilesDir(null), "screenshots").apply { mkdirs() }
        listOf("Decide", "Inventory", "Cuts", "Account").forEachIndexed { index, tab ->
            compose.onNodeWithTag("tab$tab").performClick()
            compose.waitForIdle()
            instrumentation.waitForIdleSync()
            // Capture the actual device surface, including its navigation and status bars.
            val bitmap = requireNotNull(instrumentation.uiAutomation.takeScreenshot())
            File(directory, "0${index + 1}-$tab.png").outputStream().use { bitmap.compress(Bitmap.CompressFormat.PNG, 100, it) }
            bitmap.recycle()
        }
    }

}
