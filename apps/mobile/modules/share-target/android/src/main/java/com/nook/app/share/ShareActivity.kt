package com.nook.app.share

import android.content.Intent
import android.graphics.Color
import android.net.Uri
import android.os.Bundle
import android.util.Log
import android.util.Patterns
import android.view.WindowManager
import android.widget.Toast
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
        val sharedUrl = firstSharedUrl(sharedText)

        var groups by mutableStateOf<List<Group>>(emptyList())
        val api = ShareApiClient(applicationContext)
        if (!api.hasSession()) {
            showLoginRequiredAndFinish()
            return
        }

        lifecycleScope.launch {
            runCatching { api.groups() }
                .onSuccess { groups = it }
                .onFailure { error ->
                    Log.e(TAG, "그룹 조회 실패", error)
                    if (error is ShareAuthenticationRequiredException) {
                        showLoginRequiredAndFinish()
                    } else {
                        Toast.makeText(this@ShareActivity, "그룹을 불러오지 못했습니다.", Toast.LENGTH_SHORT).show()
                    }
                }
        }

        setContent {
            ShareScreen(
                groups = groups,
                onSave = { selected, memo, onResult ->
                    lifecycleScope.launch {
                        runCatching {
                            val url = requireNotNull(sharedUrl) { "공유할 링크가 없습니다" }
                            api.savePost(url, selected, memo)
                        }.onSuccess {
                            onResult(true)
                            finish()
                        }.onFailure { error ->
                            Log.e(TAG, "게시글 저장 실패", error)
                            if (error is ShareAuthenticationRequiredException) {
                                showLoginRequiredAndFinish()
                            } else {
                                Toast.makeText(this@ShareActivity, "게시글을 저장하지 못했습니다.", Toast.LENGTH_SHORT).show()
                            }
                            onResult(false)
                        }
                    }
                },
                onCreateGroup = { name, colorIndex, onResult ->
                    lifecycleScope.launch {
                        runCatching { api.createGroup(name, colorIndex) }
                            .onSuccess {
                                groups = groups + it
                                onResult(true)
                            }
                            .onFailure { error ->
                                Log.e(TAG, "그룹 생성 실패", error)
                                if (error is ShareAuthenticationRequiredException) {
                                    showLoginRequiredAndFinish()
                                } else {
                                    Toast.makeText(this@ShareActivity, "그룹을 만들지 못했습니다.", Toast.LENGTH_SHORT).show()
                                }
                                onResult(false)
                            }
                    }
                },
                onDismiss = { finish() },
            )
        }
    }

    private fun firstSharedUrl(text: String): String? {
        val matcher = Patterns.WEB_URL.matcher(text)
        while (matcher.find()) {
            val value = matcher.group().trimEnd('.', ',', ';')
            val scheme = Uri.parse(value).scheme?.lowercase()
            if (scheme == "http" || scheme == "https") return value
        }
        return null
    }

    private fun showLoginRequiredAndFinish() {
        Toast.makeText(this, "로그인이 필요합니다.", Toast.LENGTH_SHORT).show()
        finish()
    }

    private companion object {
        const val TAG = "NookShare"
    }
}
