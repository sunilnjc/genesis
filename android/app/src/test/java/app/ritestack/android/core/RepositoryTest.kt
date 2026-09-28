package app.ritestack.android.core

import kotlinx.coroutines.CancellationException
import kotlinx.coroutines.runBlocking
import org.junit.Assert.*
import org.junit.Test
import java.math.BigDecimal

class RepositoryTest {
    private class FakeGateway : AccountGateway {
        override var session: Session? = Session("test-token", "test-refresh", Long.MAX_VALUE, AuthUser(AppState.DEMO_ID, "sample@example.com"))
        val row = Tool(userId = AppState.DEMO_ID, name = "Existing", monthlyCost = BigDecimal("20"), renewDate = "2026-10-01")
        var failWrite = false
        var failRead = false
        var writes = 0
        var cancelSignOut = false
        override suspend fun restore() {}
        override suspend fun clear() { session = null }
        override suspend fun requestCode(email: String) {}
        override suspend fun verify(email: String, code: String) {}
        override suspend fun signInWithPassword(email: String, password: String) {}
        override suspend fun tools() = listOf(row)
        override suspend fun profile(): Profile {
            if (failRead) throw java.io.IOException("unavailable")
            return Profile("2099-01-01T00:00:00Z", null)
        }
        override suspend fun save(tool: Tool, isNew: Boolean): Tool { writes++; if (failWrite) throw java.io.IOException("unavailable"); return tool }
        override suspend fun remove(tool: Tool) { if (failWrite) throw java.io.IOException("unavailable") }
        override suspend fun deleteAccount() { if (failWrite) throw java.io.IOException("unavailable"); clear() }
        override suspend fun signOut() { clear(); if (cancelSignOut) throw CancellationException() }
    }
    @Test fun failedSaveAndDeletePreserveVisibleRows() = runBlocking {
        val api = FakeGateway(); val repo = RiteStackRepository(api); repo.start(); api.failWrite = true
        assertFalse(repo.save(api.row.copy(name = "Changed"), false)); assertEquals(listOf(api.row), repo.state.value.tools)
        assertFalse(repo.remove(api.row)); assertEquals(listOf(api.row), repo.state.value.tools)
        assertFalse(repo.deleteAccount()); assertTrue(repo.state.value.signedIn)
    }
    @Test fun foreignOwnerNeverReachesGateway() = runBlocking {
        val api = FakeGateway(); val repo = RiteStackRepository(api); repo.start()
        assertFalse(repo.save(api.row.copy(userId = "00000000-0000-0000-0000-000000000099"), false))
        assertEquals(0, api.writes)
    }
    @Test fun failedRefreshRevokesCachedRitualAccess() = runBlocking {
        val api = FakeGateway(); val repo = RiteStackRepository(api); repo.start(); assertTrue(repo.state.value.canDecide)
        api.failRead = true; assertFalse(repo.refresh()); assertFalse(repo.state.value.canDecide)
        assertFalse(repo.decide(api.row, Decision.CUT)); assertEquals(0, api.writes)
        assertEquals(listOf(api.row), repo.state.value.tools)
    }
    @Test fun signOutErasesVisibleAccountEvenIfRemoteLogoutCancelled() = runBlocking {
        val api = FakeGateway(); val repo = RiteStackRepository(api); repo.start(); api.cancelSignOut = true
        try { repo.signOut(); fail("Cancellation must propagate") } catch (_: CancellationException) {}
        assertFalse(repo.state.value.signedIn); assertTrue(repo.state.value.tools.isEmpty()); assertNull(api.session)
        assertFalse(repo.state.value.busy)
    }
    @Test fun sampleChangesNeverReachGatewayAndResetAfterExit() = runBlocking {
        val api = FakeGateway(); api.session = null
        val repo = RiteStackRepository(api); repo.start(); repo.startDemo()
        val row = repo.state.value.tools.first(); assertTrue(repo.decide(row, Decision.CUT)); assertEquals(0, api.writes)
        repo.signOut(); repo.startDemo(); assertEquals(Decision.UNDECIDED, repo.state.value.tools.first().decision)
    }
}
