package com.nook.session

import android.content.Context
import android.security.keystore.KeyGenParameterSpec
import android.security.keystore.KeyProperties
import android.util.Base64
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition
import java.security.KeyStore
import javax.crypto.Cipher
import javax.crypto.KeyGenerator
import javax.crypto.SecretKey
import javax.crypto.spec.GCMParameterSpec
import org.json.JSONObject

class NookSessionModule : Module() {
  override fun definition() = ModuleDefinition {
    Name("NookSession")
    AsyncFunction("getSession") { vault().read() }
    AsyncFunction("setSession") { accessToken: String, refreshToken: String? ->
      vault().write(accessToken, refreshToken)
    }
    AsyncFunction("clearSession") {
      val context = requireNotNull(appContext.reactContext)
      vault().clear()
      context.getSharedPreferences("nook_shares", Context.MODE_PRIVATE).edit().clear().commit()
    }
  }

  private fun vault() = AndroidSessionVault(requireNotNull(appContext.reactContext))
}

internal class AndroidSessionVault(context: Context) {
  private val prefs = context.getSharedPreferences("nook_session_v1", Context.MODE_PRIVATE)
  private val alias = "nook_session_aes_v1"

  fun read(): Map<String, Any?>? = synchronized(this) {
    val encoded = prefs.getString("record", null) ?: return null
    return try {
      val bytes = Base64.decode(encoded, Base64.NO_WRAP)
      val iv = bytes.copyOfRange(0, 12)
      val cipher = Cipher.getInstance("AES/GCM/NoPadding")
      cipher.init(Cipher.DECRYPT_MODE, key(), GCMParameterSpec(128, iv))
      val json = JSONObject(String(cipher.doFinal(bytes.copyOfRange(12, bytes.size)), Charsets.UTF_8))
      mapOf(
        "schemaVersion" to 1,
        "accessToken" to json.getString("accessToken"),
        "refreshToken" to if (json.isNull("refreshToken")) null else json.getString("refreshToken"),
        "revision" to json.getInt("revision"),
      )
    } catch (_: Exception) {
      clear()
      null
    }
  }

  fun write(accessToken: String, refreshToken: String?): Map<String, Any?> = synchronized(this) {
    require(accessToken.isNotBlank())
    val revision = ((read()?.get("revision") as? Number)?.toInt() ?: 0) + 1
    val json = JSONObject().put("schemaVersion", 1).put("accessToken", accessToken)
      .put("refreshToken", refreshToken ?: JSONObject.NULL).put("revision", revision)
    val cipher = Cipher.getInstance("AES/GCM/NoPadding")
    cipher.init(Cipher.ENCRYPT_MODE, key())
    val encrypted = cipher.iv + cipher.doFinal(json.toString().toByteArray(Charsets.UTF_8))
    check(prefs.edit().putString("record", Base64.encodeToString(encrypted, Base64.NO_WRAP)).commit())
    mapOf("schemaVersion" to 1, "accessToken" to accessToken, "refreshToken" to refreshToken, "revision" to revision)
  }

  fun clear() { prefs.edit().remove("record").commit() }

  private fun key(): SecretKey {
    val store = KeyStore.getInstance("AndroidKeyStore").apply { load(null) }
    (store.getKey(alias, null) as? SecretKey)?.let { return it }
    return KeyGenerator.getInstance(KeyProperties.KEY_ALGORITHM_AES, "AndroidKeyStore").run {
      init(KeyGenParameterSpec.Builder(alias, KeyProperties.PURPOSE_ENCRYPT or KeyProperties.PURPOSE_DECRYPT)
        .setBlockModes(KeyProperties.BLOCK_MODE_GCM).setEncryptionPaddings(KeyProperties.ENCRYPTION_PADDING_NONE).build())
      generateKey()
    }
  }
}
