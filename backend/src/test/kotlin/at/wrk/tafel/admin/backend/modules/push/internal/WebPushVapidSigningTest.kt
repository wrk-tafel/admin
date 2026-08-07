package at.wrk.tafel.admin.backend.modules.push.internal

import at.wrk.tafel.admin.backend.config.properties.TafelAdminProperties
import at.wrk.tafel.admin.backend.config.properties.TafelAdminPushProperties
import at.wrk.tafel.admin.backend.database.model.push.PushSubscriptionEntity
import io.jsonwebtoken.Jwts
import org.assertj.core.api.Assertions.assertThat
import org.junit.jupiter.api.Test
import org.springframework.http.HttpHeaders
import org.springframework.http.HttpStatus
import org.springframework.mock.http.client.MockClientHttpRequest
import org.springframework.test.web.client.ExpectedCount
import org.springframework.test.web.client.MockRestServiceServer
import org.springframework.test.web.client.match.MockRestRequestMatchers.requestTo
import org.springframework.test.web.client.response.MockRestResponseCreators.withStatus
import org.springframework.web.client.RestClient
import java.security.KeyPair
import java.security.SecureRandom
import java.security.interfaces.ECPrivateKey
import java.security.interfaces.ECPublicKey
import javax.crypto.Cipher
import javax.crypto.KeyAgreement
import javax.crypto.Mac
import javax.crypto.spec.GCMParameterSpec
import javax.crypto.spec.SecretKeySpec

/**
 * The acceptance test for a Web Push send: real P-256 key material on both sides, the real signer
 * and the real encryption, asserted from the position of the two parties that receive the request.
 *
 * The push service sees the `Authorization: vapid t=..., k=...` header and the `aes128gcm` content
 * encoding - that part is checked here directly. The browser behind it sees a body only its own
 * subscription key can open, which is checked by decrypting it with that key. Everything in between
 * ([WebPushSenderServiceTest], [VapidSignerTest], [WebPushEncryptionServiceTest]) tests one piece
 * with the others mocked or reimplemented; this is the one test where a mistake in how the pieces
 * are wired together still shows up.
 */
internal class WebPushVapidSigningTest {

    private val endpoint = "https://push.example.com/subscription-id"

    private val serverKeys: KeyPair = WebPushEcKeys.generateKeyPair()
    private val serverPublicKey = WebPushEcKeys.encodePublicKey(serverKeys.public as ECPublicKey)

    // Stands in for the browser's subscription keypair - only its public half ever reaches a real
    // server, so only that half is handed to the subscription below.
    private val subscriptionKeys: KeyPair = WebPushEcKeys.generateKeyPair()
    private val subscriptionPublicKey = WebPushEcKeys.encodePublicKey(subscriptionKeys.public as ECPublicKey)
    private val authSecret = ByteArray(16).also { SecureRandom().nextBytes(it) }

    private val subscription = PushSubscriptionEntity().apply {
        id = 1
        endpoint = this@WebPushVapidSigningTest.endpoint
        p256dhKey = WebPushEcKeys.encodeBase64Url(subscriptionPublicKey)
        authKey = WebPushEcKeys.encodeBase64Url(authSecret)
    }

    private val vapidSigner = VapidSigner(
        TafelAdminProperties(
            push = TafelAdminPushProperties(
                vapidPublicKey = WebPushEcKeys.encodeBase64Url(serverPublicKey),
                vapidPrivateKey = WebPushEcKeys.encodeBase64Url((serverKeys.private as ECPrivateKey).s.toByteArray()),
                vapidSubject = "mailto:test@localhost",
            ),
        ),
    )

    private val restClientBuilder = RestClient.builder()
    private val mockServer = MockRestServiceServer.bindTo(restClientBuilder).build()
    private val service = WebPushSenderService(vapidSigner, WebPushEncryptionService(), restClientBuilder.build())

    @Test
    fun `sends a VAPID-signed, aes128gcm-encrypted notification the subscriber can read`() {
        val payload = """{"notification":{"title":"test","body":"Ausgabe beendet"}}"""
        var capturedAuthorization: String? = null
        var capturedContentEncoding: String? = null
        var capturedBody: ByteArray? = null

        mockServer.expect(ExpectedCount.once(), requestTo(endpoint))
            .andRespond { request ->
                val sentRequest = request as MockClientHttpRequest
                capturedAuthorization = sentRequest.headers.getFirst(HttpHeaders.AUTHORIZATION)
                capturedContentEncoding = sentRequest.headers.getFirst(HttpHeaders.CONTENT_ENCODING)
                capturedBody = sentRequest.bodyAsBytes
                withStatus(HttpStatus.CREATED).createResponse(sentRequest)
            }

        val result = service.send(subscription, payload)

        assertThat(result).isEqualTo(PushSendResult.SENT)
        mockServer.verify()

        assertThat(capturedContentEncoding).isEqualTo("aes128gcm")

        // `t=` is the signed VAPID token, `k=` this server's public key - a push service checks that
        // the token verifies against exactly that key.
        val authorization = requireNotNull(capturedAuthorization)
        assertThat(authorization).startsWith("vapid t=")
        assertThat(authorization).endsWith(", k=${WebPushEcKeys.encodeBase64Url(serverPublicKey)}")
        val token = authorization.removePrefix("vapid t=").substringBefore(", k=")
        assertThat(token.split(".")).hasSize(3).noneMatch { it.isEmpty() }

        val claims = Jwts.parser().verifyWith(serverKeys.public as ECPublicKey).build().parseSignedClaims(token).payload
        assertThat(claims.audience).containsExactly("https://push.example.com")
        assertThat(claims.subject).isEqualTo("mailto:test@localhost")

        assertThat(decryptAsSubscriber(requireNotNull(capturedBody))).isEqualTo(payload)
    }

    /**
     * What the browser does with the body: read the salt and the server's ephemeral public key out
     * of the RFC 8188 header, redo the RFC 8291 derivation from the subscription's private key, and
     * open the record.
     */
    private fun decryptAsSubscriber(body: ByteArray): String {
        val salt = body.copyOfRange(0, 16)
        val keyIdStart = 16 + 4 + 1
        val ephemeralPublicKey = body.copyOfRange(keyIdStart, keyIdStart + WebPushEcKeys.UNCOMPRESSED_POINT_LENGTH)
        val ciphertext = body.copyOfRange(keyIdStart + WebPushEcKeys.UNCOMPRESSED_POINT_LENGTH, body.size)

        val sharedSecret = KeyAgreement.getInstance("ECDH").run {
            init(subscriptionKeys.private)
            doPhase(WebPushEcKeys.decodePublicKey(ephemeralPublicKey), true)
            generateSecret()
        }

        val inputKeyingMaterial = hkdf(
            authSecret,
            sharedSecret,
            label("WebPush: info") + subscriptionPublicKey + ephemeralPublicKey,
            32,
        )
        val plaintext = Cipher.getInstance("AES/GCM/NoPadding").run {
            init(
                Cipher.DECRYPT_MODE,
                SecretKeySpec(hkdf(salt, inputKeyingMaterial, label("Content-Encoding: aes128gcm"), 16), "AES"),
                GCMParameterSpec(128, hkdf(salt, inputKeyingMaterial, label("Content-Encoding: nonce"), 12)),
            )
            doFinal(ciphertext)
        }

        return String(plaintext.copyOf(plaintext.size - 1), Charsets.UTF_8)
    }

    private fun label(value: String): ByteArray = value.toByteArray(Charsets.US_ASCII) + 0x00.toByte()

    private fun hkdf(salt: ByteArray, keyingMaterial: ByteArray, info: ByteArray, length: Int): ByteArray {
        val pseudoRandomKey = hmacSha256(salt, keyingMaterial)
        return hmacSha256(pseudoRandomKey, info + 0x01.toByte()).copyOf(length)
    }

    private fun hmacSha256(key: ByteArray, data: ByteArray): ByteArray = Mac.getInstance("HmacSHA256").run {
        init(SecretKeySpec(key, "HmacSHA256"))
        doFinal(data)
    }
}
