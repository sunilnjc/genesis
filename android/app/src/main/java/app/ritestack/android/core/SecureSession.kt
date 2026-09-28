package app.ritestack.android.core

import android.content.Context
import android.security.keystore.KeyGenParameterSpec
import android.security.keystore.KeyProperties
import android.util.Base64
import java.io.File
import java.security.KeyStore
import javax.crypto.Cipher
import javax.crypto.KeyGenerator
import javax.crypto.SecretKey
import javax.crypto.spec.GCMParameterSpec

/** Encrypted, app-private no-backup storage. The encryption key never leaves Android Keystore. */
internal class SecureSession(context: Context) {
    private val file = File(context.noBackupFilesDir, "ritestack-session")
    private val alias = "ritestack.session.v1"
    private fun key(): SecretKey {
        val store = KeyStore.getInstance("AndroidKeyStore").apply { load(null) }
        (store.getKey(alias, null) as? SecretKey)?.let { return it }
        return KeyGenerator.getInstance(KeyProperties.KEY_ALGORITHM_AES, "AndroidKeyStore").apply {
            init(KeyGenParameterSpec.Builder(alias, KeyProperties.PURPOSE_ENCRYPT or KeyProperties.PURPOSE_DECRYPT)
                .setBlockModes(KeyProperties.BLOCK_MODE_GCM).setEncryptionPaddings(KeyProperties.ENCRYPTION_PADDING_NONE).build())
        }.generateKey()
    }
    @Synchronized fun read(): String? {
        if (!file.exists()) return null
        return try {
            val parts = file.readText().split(":")
            require(parts.size == 2)
            val cipher = Cipher.getInstance("AES/GCM/NoPadding")
            cipher.init(Cipher.DECRYPT_MODE, key(), GCMParameterSpec(128, Base64.decode(parts[0], Base64.NO_WRAP)))
            String(cipher.doFinal(Base64.decode(parts[1], Base64.NO_WRAP)), Charsets.UTF_8)
        } catch (error: Exception) { clear(); null }
    }
    @Synchronized fun save(value: String) {
        val cipher = Cipher.getInstance("AES/GCM/NoPadding")
        cipher.init(Cipher.ENCRYPT_MODE, key())
        val encoded = Base64.encodeToString(cipher.iv, Base64.NO_WRAP) + ":" + Base64.encodeToString(cipher.doFinal(value.toByteArray(Charsets.UTF_8)), Base64.NO_WRAP)
        val temporary = File(file.parentFile, "ritestack-session.tmp")
        temporary.writeText(encoded)
        check(temporary.renameTo(file)) { "Could not securely save your session." }
    }
    @Synchronized fun clear() {
        // Invalidate the key as well as deleting ciphertext: a failed file deletion must never resurrect a session.
        val keyRemoved = runCatching {
            KeyStore.getInstance("AndroidKeyStore").apply { load(null); deleteEntry(alias) }
        }.isSuccess
        val temporary = File(file.parentFile, "ritestack-session.tmp")
        val fileRemoved = !file.exists() || file.delete()
        val tempRemoved = !temporary.exists() || temporary.delete()
        check(keyRemoved || (fileRemoved && tempRemoved)) { "Could not erase your saved session. Please clear RiteStack storage in Android Settings." }
    }
}
