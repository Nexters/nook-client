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
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale
import java.util.TimeZone
import java.util.UUID
import javax.crypto.Cipher
import javax.crypto.SecretKey
import javax.crypto.spec.GCMParameterSpec
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import org.json.JSONArray
import org.json.JSONObject

internal data class ShareSession(val accessToken: String, val refreshToken: String?, val apiBaseUrl: String?, val revision: Int)
internal class ShareAuthenticationRequiredException : IllegalStateException("로그인이 필요합니다")
internal class ShareHttpException(val status: Int) : IllegalStateException("API 요청 실패 ($status)")
internal class SharePrivatePostException : IllegalStateException("비공개 게시물은 저장할 수 없습니다")

class ShareApiClient(private val context: Context) {
    private val vault = ShareSessionVault(context)

    // 토큰은 발급한 API 에서만 유효하므로 본앱이 세션에 기록해 둔 발급처로만 보낸다.
    // 기록에는 버전 경로가 없고(웹 규약) 확장은 `/groups` 처럼 버전 없는 경로를 쓰므로 여기서 붙인다.
    // 기록이 없으면 이 필드가 생기기 전의 세션이다 — 보낼 곳을 모르니 로그인 안내로 넘겨
    // 본앱을 열게 한다. 저장소는 건드리지 않아 앱을 열면 재로그인 없이 이어진다.
    private fun baseUrl(session: ShareSession): String =
        session.apiBaseUrl?.takeIf { it.isNotBlank() }?.trimEnd('/')?.plus("/api/v1")
            ?: throw ShareAuthenticationRequiredException()

    fun hasSession(): Boolean = vault.read() != null

    suspend fun groups(): List<Group> = withContext(Dispatchers.IO) {
        val body = protectedRequest("/groups")
        val values = unwrap(body).getJSONArray("value")
        buildList {
            for (index in 0 until values.length()) {
                val item = values.getJSONObject(index)
                // /groups 는 공유받은 아카이브도 함께 준다 — 남의 아카이브에는 저장할 수 없으니 내 것만 남긴다.
                if (item.optString("accessType") == "SHARED") continue
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

    // 온보딩 전환 측정 (`POST /onboarding/events`).
    //
    // 확장이 열린 순간을 먼저 저장소에 적고 보낸다 — 사용자가 바로 닫아도 기록이 남고, 다음에
    // 확장이 열릴 때 다시 보낸다. 서버가 eventId 로 중복을 걸러 주므로 재전송은 id·시각을 그대로
    // 쓴다. 탭한 계정(JWT sub)을 함께 적어 두고 지금 계정의 것만 보낸다.
    // 웹의 `features/onboarding/onboardingEvents.ts`, iOS `ShareApiClient.swift` 와 같은 규칙이다.
    private val eventPrefs = context.getSharedPreferences("nook_onboarding_events", Context.MODE_PRIVATE)

    // 블로킹 호출만 있는 한 블록이라, 화면이 닫혀 코루틴이 취소돼도 시작한 전송·삭제는 끝까지 간다.
    suspend fun recordShareExtensionOpen() = withContext(Dispatchers.IO) {
        val owner = currentOwner() ?: return@withContext
        val now = System.currentTimeMillis()
        val utc = SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss'Z'", Locale.US).apply { timeZone = TimeZone.getTimeZone("UTC") }
        val event = JSONObject()
            .put("eventId", UUID.randomUUID().toString())
            .put("eventName", "SHARE_EXTENSION_OPEN")
            .put("occurredAt", utc.format(Date(now)))
            .put("atMs", now)
            .put("owner", owner)
        writeEvents(readEvents() + event)
        flushOnboardingEvents(owner)
    }

    private fun flushOnboardingEvents(owner: String) {
        for (event in readEvents().filter { it.optString("owner") == owner }) {
            val id = event.getString("eventId")
            val body = JSONObject().put("eventId", id).put("eventName", event.getString("eventName"))
                .put("occurredAt", event.getString("occurredAt")).toString()
            try {
                protectedRequest("/onboarding/events", "POST", body)
                removeEvent(id)
            } catch (error: ShareHttpException) {
                // 종류·UUID·시각 오류(단말 시계가 서버보다 빠름 등). 다시 보내도 같다.
                if (error.status != 400) return
                Log.w(TAG, "온보딩 이벤트 거절됨, 버림: $id")
                removeEvent(id)
            } catch (_: Exception) {
                return // 네트워크·세션 없음: 남겨 두고 다음 실행 때 다시 보낸다.
            }
        }
    }

    // 서버 허용 범위는 발생 후 7일. 경계에서 400 이 나지 않게 1시간 일찍 버린다.
    private fun readEvents(): List<JSONObject> {
        val minMs = System.currentTimeMillis() - (7 * 24 - 1) * 3_600_000L
        val array = runCatching { JSONArray(eventPrefs.getString("pending", "[]")) }.getOrNull() ?: return emptyList()
        return (0 until array.length()).mapNotNull { array.optJSONObject(it) }.filter { it.optLong("atMs") >= minMs }
    }

    private fun writeEvents(events: List<JSONObject>) {
        eventPrefs.edit().putString("pending", JSONArray(events).toString()).commit()
    }

    private fun removeEvent(eventId: String) {
        writeEvents(readEvents().filter { it.optString("eventId") != eventId })
    }

    /** 토큰의 `sub`. 서명은 확인하지 않는다 — 어느 계정 이벤트인지 가르는 데만 쓴다. */
    private fun currentOwner(): String? = runCatching {
        val payload = vault.read()?.accessToken?.split('.')?.getOrNull(1) ?: return null
        val json = JSONObject(String(Base64.decode(payload, Base64.URL_SAFE or Base64.NO_PADDING or Base64.NO_WRAP), Charsets.UTF_8))
        json.opt("sub")?.takeIf { it != JSONObject.NULL }?.toString()
    }.getOrNull()

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
        return status?.let { ShareHttpException(it) } ?: IllegalStateException("API 실패 응답")
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
