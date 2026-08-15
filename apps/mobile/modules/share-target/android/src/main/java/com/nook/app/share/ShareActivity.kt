package com.nook.app.share

import android.content.Intent
import android.graphics.Color
import android.net.Uri
import android.os.Bundle
import android.util.Log
import android.util.Patterns
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
    private lateinit var api: ShareApiClient
    private var sharedUrl: String? = null
    private var groups by mutableStateOf<List<Group>>(emptyList())
    private var feedback by mutableStateOf<ShareFeedbackState?>(null)
    private var feedbackAction: () -> Unit = {}
    private var feedbackId = 0L

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
        sharedUrl = firstSharedUrl(sharedText)

        api = ShareApiClient(applicationContext)
        if (!api.hasSession()) {
            showFeedback(ShareFeedbackKind.Login) { openContainingApp("login") }
        }

        setContent {
            ShareScreen(
                groups = groups,
                feedback = feedback,
                onSave = { selected, memo, onResult ->
                    savePost(selected, memo, onResult)
                },
                onCreateGroup = { name, colorIndex, onResult ->
                    createGroup(name, colorIndex, onResult)
                },
                onFeedbackAction = { feedbackAction() },
                onDismiss = { finish() },
            )
        }

        if (api.hasSession()) loadGroups()
    }

    private fun loadGroups() {
        lifecycleScope.launch {
            runCatching { api.groups() }
                .onSuccess {
                    groups = it
                    feedback = null
                }
                .onFailure { error ->
                    Log.e(TAG, "아카이브 조회 실패", error)
                    handleFailure(error, ::loadGroups)
                }
        }
    }

    private fun savePost(
        selected: Set<Long>,
        memo: String,
        onResult: ((Boolean) -> Unit)? = null,
    ) {
        lifecycleScope.launch {
            runCatching {
                val url = sharedUrl ?: throw SharePrivatePostException()
                api.savePost(url, selected, memo)
            }.onSuccess { postId ->
                onResult?.invoke(true)
                showFeedback(ShareFeedbackKind.Success) { openContainingApp("post/$postId") }
            }.onFailure { error ->
                Log.e(TAG, "게시글 저장 실패", error)
                onResult?.invoke(false)
                handleFailure(error) { savePost(selected, memo) }
            }
        }
    }

    private fun createGroup(
        name: String,
        colorIndex: Int,
        onResult: ((Boolean) -> Unit)? = null,
    ) {
        lifecycleScope.launch {
            runCatching { api.createGroup(name, colorIndex) }
                .onSuccess {
                    groups = groups + it
                    feedback = null
                    onResult?.invoke(true)
                }
                .onFailure { error ->
                    Log.e(TAG, "아카이브 생성 실패", error)
                    onResult?.invoke(false)
                    handleFailure(error) { createGroup(name, colorIndex) }
                }
        }
    }

    private fun handleFailure(error: Throwable, retry: () -> Unit) {
        when (error) {
            is ShareAuthenticationRequiredException ->
                showFeedback(ShareFeedbackKind.Login) { openContainingApp("login") }
            is SharePrivatePostException ->
                showFeedback(ShareFeedbackKind.PrivatePost) { finish() }
            else -> showFeedback(ShareFeedbackKind.Network, retry)
        }
    }

    private fun showFeedback(kind: ShareFeedbackKind, action: () -> Unit) {
        feedbackAction = action
        feedback = ShareFeedbackState(kind, ++feedbackId)
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

    private fun openContainingApp(path: String) {
        packageManager.getLaunchIntentForPackage(packageName)?.let { launchIntent ->
            // getLaunchIntentForPackage는 ACTION_MAIN을 반환한다. React Native Linking은
            // ACTION_VIEW 인텐트만 URL로 전달하므로 액션을 명시적으로 바꾼다.
            launchIntent.action = Intent.ACTION_VIEW
            launchIntent.data = Uri.parse("$packageName://$path")
            launchIntent.addFlags(Intent.FLAG_ACTIVITY_CLEAR_TOP or Intent.FLAG_ACTIVITY_SINGLE_TOP)
            startActivity(launchIntent)
        }
        finish()
    }

    private companion object {
        const val TAG = "NookShare"
    }
}
