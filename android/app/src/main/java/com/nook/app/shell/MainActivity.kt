package com.nook.app.shell

import android.annotation.SuppressLint
import android.content.Intent
import android.net.Uri
import android.os.Bundle
import android.webkit.JavascriptInterface
import android.webkit.WebResourceRequest
import android.webkit.WebView
import android.webkit.WebViewClient
import androidx.activity.OnBackPressedCallback
import androidx.appcompat.app.AppCompatActivity
import org.json.JSONArray
import org.json.JSONObject

/**
 * 얇은 네이티브 셸. WKWebView(iOS) 대응인 Android WebView 로 원격 웹(app.nook.com)을 로드하고,
 * WebView 가 못 하는 것(공유 핸드오프·외부링크·뒤로가기)만 브리지로 처리한다.
 */
class MainActivity : AppCompatActivity() {

    private lateinit var webView: WebView

    @SuppressLint("SetJavaScriptEnabled")
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)

        webView = WebView(this).apply {
            settings.javaScriptEnabled = true
            settings.domStorageEnabled = true
            webViewClient = ShellWebViewClient()
            addJavascriptInterface(WebBridge(), "NookNative")
        }
        setContentView(webView)

        // 시스템 뒤로가기 → 웹 히스토리 우선, 없으면 기본 동작(앱 종료)
        onBackPressedDispatcher.addCallback(this, object : OnBackPressedCallback(true) {
            override fun handleOnBackPressed() {
                if (webView.canGoBack()) {
                    webView.goBack()
                } else {
                    isEnabled = false
                    onBackPressedDispatcher.onBackPressed()
                }
            }
        })

        webView.loadUrl(WEB_URL)
    }

    override fun onResume() {
        super.onResume()
        deliverPendingShares()
        postToWeb(JSONObject().put("v", BRIDGE_VERSION).put("type", "APP_RESUMED").put("payload", JSONObject()))
    }

    /** 셸 → 웹: 네이티브가 노출한 window.__nookReceive(json) 호출 */
    private fun postToWeb(message: JSONObject) {
        val js = "window.__nookReceive && window.__nookReceive(${JSONObject.quote(message.toString())})"
        webView.post { webView.evaluateJavascript(js, null) }
    }

    /** Share Extension/ShareActivity 가 저장한 pending 공유를 웹으로 전달 후 비운다. */
    private fun deliverPendingShares() {
        val prefs = getSharedPreferences("nook_shares", MODE_PRIVATE)
        val pending = prefs.getString("pending", "[]") ?: "[]"
        val items = try { JSONArray(pending) } catch (_: Exception) { JSONArray() }
        if (items.length() == 0) return
        postToWeb(
            JSONObject()
                .put("v", BRIDGE_VERSION)
                .put("type", "SHARE_RECEIVED")
                .put("payload", JSONObject().put("items", items)),
        )
        prefs.edit().putString("pending", "[]").apply()
    }

    /** 웹 → 셸 */
    private inner class WebBridge {
        @JavascriptInterface
        fun postMessage(json: String) {
            val message = try { JSONObject(json) } catch (_: Exception) { return }
            when (message.optString("type")) {
                "WEB_READY" -> runOnUiThread { deliverPendingShares() }
                "OPEN_EXTERNAL_URL" -> openExternal(message.optJSONObject("payload")?.optString("url"))
                // 후속 레그: REQUEST_LOCATION, NAV_STATE
            }
        }
    }

    private fun openExternal(url: String?) {
        if (url.isNullOrBlank()) return
        if (!url.startsWith("http://") && !url.startsWith("https://")) return
        runOnUiThread { startActivity(Intent(Intent.ACTION_VIEW, Uri.parse(url))) }
    }

    /** app.nook.com 은 인앱, 그 외 외부 링크는 시스템 브라우저로 */
    private inner class ShellWebViewClient : WebViewClient() {
        override fun shouldOverrideUrlLoading(view: WebView, request: WebResourceRequest): Boolean {
            val url = request.url.toString()
            if (url.startsWith(WEB_ORIGIN)) return false
            openExternal(url)
            return true
        }
    }

    private companion object {
        const val BRIDGE_VERSION = 1
        // 스파이크: 원격 웹 origin. dev 는 dev 서버 URL 로 교체(추후 BuildConfig).
        const val WEB_ORIGIN = "https://app.nook.com"
        const val WEB_URL = "https://app.nook.com"
    }
}
