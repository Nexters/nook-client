package com.nook.app.share

import android.content.Context
import android.security.keystore.KeyProperties
import android.util.Base64
import android.util.Log
import com.nook.app.share.model.Group
import com.nook.app.share.model.groupColor
import com.nook.app.share.model.groupColorNames
import java.io.File
import java.net.HttpURLConnection
import java.net.URL
import java.nio.channels.FileChannel
import java.nio.charset.StandardCharsets
import java.nio.file.StandardOpenOption
import java.security.KeyStore
import javax.crypto.Cipher
import javax.crypto.SecretKey
import javax.crypto.spec.GCMParameterSpec
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import org.json.JSONArray
import org.json.JSONObject

internal data class ShareSession(val accessToken: String, val refreshToken: String?, val apiBaseUrl: String?, val revision: Int)
internal class ShareAuthenticationRequiredException : IllegalStateException("로그인이 필요합니다")
internal class SharePrivatePostException : IllegalStateException("비공개 게시물은 저장할 수 없습니다")

class ShareApiClient(private val context: Context) {
    private val vault = ShareSessionVault(context)
    // 세션에 발급처(apiBaseUrl)가 기록돼 있으면 그쪽을 쓰고, 이건 그 기록이 없을 때의 폴백이다.
    private val fallbackBaseUrl: String by lazy {
        val id = context.resources.getIdentifier("nook_api_base_url", "string", context.packageName)
        if (id == 0) throw IllegalStateException("Native API Base URL 미설정")
        context.getString(id).trimEnd('/')
    }

    // 토큰은 발급한 API 에서만 유효하다. 빌드 variant 의 API 와 웹이 실제 쓰는 API 가
    // 어긋나 있어도, 본앱이 세션에 함께 기록한 발급처로 보내면 항상 짝이 맞는다.
    private fun baseUrl(session: ShareSession): String =
        session.apiBaseUrl?.takeIf { it.isNotBlank() }?.trimEnd('/') ?: fallbackBaseUrl

    fun hasSession(): Boolean = vault.read() != null

    suspend fun groups(): List<Group> = withContext(Dispatchers.IO) {
        val body = protectedRequest("/groups")
        val values = unwrap(body).getJSONArray("value")
        buildList {
            for (index in 0 until values.length()) {
                val item = values.getJSONObject(index)
                add(Group(item.getLong("id"), item.getString("name"), groupColor(item.getString("color"))))
            }
        }
    }

    suspend fun createGroup(name: String, colorIndex: Int): Group = withContext(Dispatchers.IO) {
        val body = protectedRequest(
            "/groups", "POST",
            JSONObject().put("name", name.trim()).put("color", groupColorNames[colorIndex]).toString(),
        )
        val item = unwrap(body).getJSONObject("value")
        Group(item.getLong("id"), item.getString("name"), groupColor(item.getString("color")))
    }

    suspend fun savePost(url: String, groupIds: Set<Long>, memo: String): Long = withContext(Dispatchers.IO) {
        val ids = JSONArray(groupIds)
        val response = protectedRequest(
            "/posts", "POST",
            JSONObject().put("url", url).put("groupIds", ids).put("memo", memo)
                .put("areGroupIdsPositive", groupIds.all { it > 0 }).toString(),
        )
        unwrap(response).getJSONObject("value").getLong("postId")
    }

    private fun protectedRequest(path: String, method: String = "GET", body: String? = null): String {
        val initial = vault.read() ?: throw ShareAuthenticationRequiredException()
        var response = request(baseUrl(initial), path, method, body, initial.accessToken)
        if (response.first != 401) return requireSuccess(response)
        val refreshed = refresh(initial.revision) ?: throw ShareAuthenticationRequiredException()
        response = request(baseUrl(refreshed), path, method, body, refreshed.accessToken)
        if (response.first == 401) vault.clear()
        if (response.first == 401) throw ShareAuthenticationRequiredException()
        return requireSuccess(response)
    }

    private fun refresh(failedRevision: Int): ShareSession? {
        val lockFile = File(context.filesDir, "session-refresh.lock")
        FileChannel.open(lockFile.toPath(), StandardOpenOption.CREATE, StandardOpenOption.WRITE).use { channel ->
            channel.lock().use {
                val current = vault.read() ?: return null
                if (current.revision > failedRevision) return current
                val token = current.refreshToken ?: run { vault.clear(); return null }
                val response = request(
                    baseUrl(current), "/auth/token/refresh", "POST",
                    JSONObject().put("refreshToken", token).toString(), null,
                )
                if (response.first in 400..499) { vault.clear(); return null }
                val pair = unwrap(requireSuccess(response)).getJSONObject("value")
                // 발급처 기록은 갱신을 거쳐도 유지돼야 다음 요청이 계속 같은 API 로 나간다.
                return vault.write(pair.getString("accessToken"), pair.getString("refreshToken"), current.apiBaseUrl)
            }
        }
    }

    private fun request(baseUrl: String, path: String, method: String, body: String?, token: String?): Pair<Int, String> {
        val connection = URL(baseUrl + path).openConnection() as HttpURLConnection
        return try {
            connection.requestMethod = method
            connection.connectTimeout = 15_000; connection.readTimeout = 15_000
            connection.setRequestProperty("Accept", "application/json")
            token?.let { connection.setRequestProperty("Authorization", "Bearer $it") }
            if (body != null) {
                connection.doOutput = true; connection.setRequestProperty("Content-Type", "application/json")
                connection.outputStream.use { it.write(body.toByteArray(StandardCharsets.UTF_8)) }
            }
            val status = connection.responseCode
            val stream = if (status in 200..299) connection.inputStream else connection.errorStream
            Log.d(TAG, "$method $path -> $status")
            status to (stream?.bufferedReader()?.use { it.readText() } ?: "")
        } finally { connection.disconnect() }
    }

    private fun requireSuccess(response: Pair<Int, String>): String {
        if (response.first !in 200..299) throw mappedFailure(response.second, response.first)
        return response.second
    }

    // JSONObject.NULL 대신 wrapper를 써 array/object 결과를 같은 코드로 처리한다.
    private fun unwrap(body: String): JSONObject {
        val envelope = JSONObject(body)
        if (envelope.getString("resultType") != "SUCCESS") throw mappedFailure(body)
        if (!envelope.has("success")) throw IllegalStateException("API 성공 본문 누락")
        return JSONObject().put("value", envelope.get("success"))
    }

    // 서버가 확정한 PRIVATE_POST 만 비공개 안내로 보낸다.
    // 나머지 실패는 네트워크 안내로 떨어뜨려 "다시하기" 를 남긴다 — 원인을 모르는 실패에
    // "비공개 게시물" 을 띄우면 사용자가 할 수 있는 게 없다.
    private fun mappedFailure(body: String, status: Int? = null): IllegalStateException {
        val error = runCatching { JSONObject(body).optJSONObject("error") }.getOrNull()
        if (error?.optString("errorCode").orEmpty().uppercase() == "PRIVATE_POST") {
            return SharePrivatePostException()
        }
        return IllegalStateException(status?.let { "API 요청 실패 ($it)" } ?: "API 실패 응답")
    }

    private companion object {
        const val TAG = "NookShare"
    }
}

private class ShareSessionVault(private val context: Context) {
    private val prefs = context.getSharedPreferences("nook_session_v1", Context.MODE_PRIVATE)
    fun read(): ShareSession? = try {
        val bytes = Base64.decode(prefs.getString("record", null) ?: return null, Base64.NO_WRAP)
        val cipher = Cipher.getInstance("AES/GCM/NoPadding")
        cipher.init(Cipher.DECRYPT_MODE, key(), GCMParameterSpec(128, bytes.copyOfRange(0, 12)))
        val json = JSONObject(String(cipher.doFinal(bytes.copyOfRange(12, bytes.size)), Charsets.UTF_8))
        ShareSession(json.getString("accessToken"), if (json.isNull("refreshToken")) null else json.getString("refreshToken"), if (json.isNull("apiBaseUrl")) null else json.optString("apiBaseUrl"), json.getInt("revision"))
    } catch (_: Exception) { clear(); null }
    fun write(accessToken: String, refreshToken: String?, apiBaseUrl: String?): ShareSession {
        val value = ShareSession(accessToken, refreshToken, apiBaseUrl, (read()?.revision ?: 0) + 1)
        val json = JSONObject().put("schemaVersion", 1).put("accessToken", accessToken).put("refreshToken", refreshToken ?: JSONObject.NULL).put("apiBaseUrl", apiBaseUrl ?: JSONObject.NULL).put("revision", value.revision)
        val cipher = Cipher.getInstance("AES/GCM/NoPadding"); cipher.init(Cipher.ENCRYPT_MODE, key())
        prefs.edit().putString("record", Base64.encodeToString(cipher.iv + cipher.doFinal(json.toString().toByteArray()), Base64.NO_WRAP)).commit()
        return value
    }
    fun clear() { prefs.edit().remove("record").commit() }
    private fun key(): SecretKey {
        val store = KeyStore.getInstance("AndroidKeyStore").apply { load(null) }
        return store.getKey("nook_session_aes_v1", null) as SecretKey
    }
}
