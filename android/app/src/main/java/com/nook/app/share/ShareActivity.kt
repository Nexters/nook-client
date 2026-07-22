package com.nook.app.share

import android.content.Intent
import android.graphics.Color
import android.os.Bundle
import android.view.WindowManager
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.core.view.WindowCompat

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
            if (intent?.action == Intent.ACTION_SEND) intent.getStringExtra(Intent.EXTRA_TEXT).orEmpty()
            else ""

        setContent {
            ShareScreen(
                onSave = { groups, memo ->
                    repository.saveToGroups(sharedText, groups, memo)
                    finish()
                },
                onCreateGroup = { name, colorIndex ->
                    repository.saveNewGroup(sharedText, name, colorIndex)
                    finish()
                },
                onDismiss = { finish() },
            )
        }
    }
}
