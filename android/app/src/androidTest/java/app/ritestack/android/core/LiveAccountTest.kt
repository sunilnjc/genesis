package app.ritestack.android.core

import androidx.test.platform.app.InstrumentationRegistry
import kotlinx.coroutines.runBlocking
import org.json.JSONObject
import org.junit.Assert.*
import org.junit.Assume.assumeTrue
import org.junit.Test
import java.math.BigDecimal
import java.util.UUID

/** Opt-in integration run. Fixtures must contain disposable QA accounts only; this test deletes both. */
class LiveAccountTest {
    private data class Account(val email: String, val password: String, val id: String)
    @Test fun passwordCrudIsolationRestoreAndDeletion() = runBlocking {
        val instrumentation = InstrumentationRegistry.getInstrumentation()
        val raw = runCatching { instrumentation.context.assets.open("integration.json").bufferedReader().use { it.readText() } }.getOrNull()
        assumeTrue("Disposable account fixture is not installed.", raw != null)
        val fixture = JSONObject(requireNotNull(raw))
        val accounts = fixture.getJSONArray("accounts")
        require(accounts.length() == 2) { "Two disposable QA accounts are required." }
        val first = accounts.getJSONObject(0).let { Account(it.getString("email"), it.getString("password"), it.getString("id")) }
        val second = accounts.getJSONObject(1).let { Account(it.getString("email"), it.getString("password"), it.getString("id")) }
        require(first.id != second.id) { "QA accounts must be distinct." }
        val context = instrumentation.targetContext
        val owner = RiteStackRepository(context)
        // Starts from an empty local session. Never print fixture content, tokens, or user details.
        owner.signOut()
        assertTrue("QA owner could not sign in.", owner.signInWithPassword(first.email, first.password))
        assertEquals("Owner identity mismatch.", first.id, owner.state.value.user?.id)
        assertTrue("QA trial access is required.", owner.state.value.canDecide)
        val row = Tool(userId = first.id, name = "Android QA ${UUID.randomUUID()}", monthlyCost = BigDecimal("12.34"), renewDate = Day.add(4, Day.today()))
        assertTrue("Create failed.", owner.save(row, true))
        var saved = owner.state.value.tools.single { it.id == row.id }
        assertTrue("Edit failed.", owner.save(saved.copy(name = "Android integration review", monthlyCost = BigDecimal("15.25")), false))
        saved = owner.state.value.tools.single { it.id == row.id }
        assertEquals(BigDecimal("15.25"), saved.monthlyCost)
        assertTrue("Pause failed.", owner.decide(saved, Decision.PAUSE))
        saved = owner.state.value.tools.single { it.id == row.id }
        assertEquals(Day.add(30, Day.today()), saved.remindAt)
        assertNull(saved.cutAt)
        assertTrue("Unpause failed.", owner.decide(saved, Decision.UNDECIDED))
        saved = owner.state.value.tools.single { it.id == row.id }
        assertNull(saved.remindAt)
        assertTrue("Keep failed.", owner.decide(saved, Decision.KEEP))
        assertTrue("Cut failed.", owner.decide(saved, Decision.CUT))
        saved = owner.state.value.tools.single { it.id == row.id }
        assertEquals(Day.today(), saved.cutAt)
        assertNull(saved.lastUsed)

        val restored = RiteStackRepository(context)
        restored.start()
        assertEquals("Encrypted session did not restore.", first.id, restored.state.value.user?.id)
        assertTrue("Saved row not restored.", restored.state.value.tools.any { it.id == row.id && it.decision == Decision.CUT })
        restored.signOut()

        val other = RiteStackRepository(context)
        assertTrue("Second QA account could not sign in.", other.signInWithPassword(second.email, second.password))
        assertEquals(second.id, other.state.value.user?.id)
        assertFalse("Account isolation failed.", other.state.value.tools.any { it.id == row.id })
        assertFalse("Foreign ownership update should fail.", other.save(saved.copy(name = "Forbidden"), false))
        assertTrue("Second QA account deletion failed.", other.deleteAccount())
        assertFalse(other.state.value.signedIn)
        assertFalse("Deleted account must not authenticate.", other.signInWithPassword(second.email, second.password))

        val cleanup = RiteStackRepository(context)
        assertTrue("Owner could not reauthenticate.", cleanup.signInWithPassword(first.email, first.password))
        assertEquals("Foreign update changed the row.", "Android integration review", cleanup.state.value.tools.single { it.id == row.id }.name)
        assertTrue("Row deletion failed.", cleanup.remove(cleanup.state.value.tools.single { it.id == row.id }))
        assertTrue("Owner QA account deletion failed.", cleanup.deleteAccount())
        assertFalse("Deleted owner must not authenticate.", cleanup.signInWithPassword(first.email, first.password))
        cleanup.signOut()
    }
}
