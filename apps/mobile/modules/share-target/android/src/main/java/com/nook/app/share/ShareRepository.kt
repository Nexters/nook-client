package com.nook.app.share

import android.content.Context
import org.json.JSONArray
import org.json.JSONObject

// 공유로 받은 내용을 앱이 다음 실행 때 읽어갈 수 있도록 SharedPreferences에 큐잉한다.
class ShareRepository(private val context: Context) {

    fun saveToGroups(text: String, groups: Set<String>, memo: String) {
        append {
            put("text", text)
            put("groups", JSONArray(groups))
            put("memo", memo)
        }
    }

    fun saveNewGroup(text: String, name: String, colorIndex: Int) {
        append {
            put("text", text)
            put("newGroupName", name)
            put("newGroupColorIndex", colorIndex)
        }
    }

    private inline fun append(build: JSONObject.() -> Unit) {
        try {
            val prefs = context.getSharedPreferences(PREFS, Context.MODE_PRIVATE)
            val pending = JSONArray(prefs.getString(KEY_PENDING, "[]"))
            pending.put(JSONObject().apply(build).apply { put("savedAt", System.currentTimeMillis()) })
            prefs.edit().putString(KEY_PENDING, pending.toString()).apply()
        } catch (_: Exception) {
        }
    }

    private companion object {
        const val PREFS = "nook_shares"
        const val KEY_PENDING = "pending"
    }
}
