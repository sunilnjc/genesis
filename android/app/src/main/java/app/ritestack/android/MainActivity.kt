package app.ritestack.android

import android.app.Application
import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.viewModels
import androidx.lifecycle.AndroidViewModel
import androidx.lifecycle.viewModelScope
import app.ritestack.android.core.RiteStackRepository
import app.ritestack.android.ui.RiteStackApp
import kotlinx.coroutines.launch

class StackViewModel(application: Application) : AndroidViewModel(application) {
    val repository = RiteStackRepository(application)
    val actions get() = viewModelScope
    private var started = false
    init { viewModelScope.launch { repository.start(); started = true } }
    fun foreground() {
        if (started && repository.state.value.signedIn && !repository.state.value.demo) {
            viewModelScope.launch { if (!repository.state.value.busy && !repository.state.value.loading) repository.refresh() }
        }
    }
}
class MainActivity : ComponentActivity() {
    private val model: StackViewModel by viewModels()
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContent { RiteStackApp(model.repository, model.actions) }
    }
    override fun onStart() { super.onStart(); model.foreground() }
}
