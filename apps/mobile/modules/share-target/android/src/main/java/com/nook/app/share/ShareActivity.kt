package com.nook.app.share

import android.content.Intent
import android.graphics.Color
import android.os.Bundle
import android.view.WindowManager
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.core.view.WindowCompat
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.setValue
import androidx.lifecycle.lifecycleScope
import com.nook.app.share.model.Group
import kotlinx.coroutines.launch

class ShareActivity : ComponentActivity() {

    private val repository by lazy { ShareRepository(applicationContext) }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)

        // dim이 상태바·노치 영역까지 덮도록 edge-to-edge
        WindowCompat.setDecorFitsSystemWindows(window, false)
        window.statusBarColor = Color.TRANSPARENT
        window.navigationBarColor = Color.TRANSPARENT
        // 키보드가 열리면 인풋이 그 위로 올라오도록 (imePadding과 함께 동작)
        window.setSoftInputMode(WindowManager.LayoutParams.SOFT_INPUT_ADJUST_RESIZE)

        val sharedText =
            if (intent?.action == Intent.ACTION_SEND) {
                intent.getCharSequenceExtra(Intent.EXTRA_TEXT)?.toString().orEmpty()
            } else ""

        var groups by mutableStateOf<List<Group>>(emptyList())
        val api = ShareApiClient(applicationContext)
        lifecycleScope.launch { groups = runCatching { api.groups() }.getOrDefault(emptyList()) }

        setContent {
            ShareScreen(
                groups = groups,
                onSave = { selected, memo ->
                    lifecycleScope.launch {
                        runCatching { api.savePost(sharedText, selected, memo) }
                            .onFailure { repository.saveToGroups(sharedText, selected, memo) }
                        finish()
                    }
                },
                onCreateGroup = { name, colorIndex ->
                    lifecycleScope.launch {
                        runCatching { api.createGroup(name, colorIndex) }
                            .onSuccess { groups = groups + it }
                    }
                },
                onDismiss = { finish() },
            )
        }
    }
}
