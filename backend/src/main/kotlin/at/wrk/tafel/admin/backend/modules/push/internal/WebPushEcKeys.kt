package at.wrk.tafel.admin.backend.modules.push.internal

import java.math.BigInteger
import java.security.AlgorithmParameters
import java.security.KeyFactory
import java.security.KeyPair
import java.security.KeyPairGenerator
import java.security.SecureRandom
import java.security.interfaces.ECPrivateKey
import java.security.interfaces.ECPublicKey
import java.security.spec.ECGenParameterSpec
import java.security.spec.ECParameterSpec
import java.security.spec.ECPoint
import java.security.spec.ECPrivateKeySpec
import java.security.spec.ECPublicKeySpec
import java.util.Base64

/**
 * The P-256 (`secp256r1`) key handling shared by both halves of a Web Push send: VAPID request
 * signing ([VapidSigner], RFC 8292) and payload encryption ([WebPushEncryptionService], RFC 8291).
 *
 * Everything here is plain JCE against the JDK's own EC provider - no third-party crypto library is
 * involved. BouncyCastle is still a dependency of this project, but only because Spring Security's
 * `Argon2PasswordEncoder` uses its classes directly (see `config.WebSecurityConfig`); nothing in
 * push needs it, and no JCE provider has to be registered for the code below to work.
 *
 * Web Push exchanges keys as *raw* material rather than DER/PEM: public keys as an uncompressed EC
 * point and private keys as the bare scalar, both base64url-encoded (see
 * [at.wrk.tafel.admin.backend.config.properties.TafelAdminPushProperties] for how the server's own
 * VAPID keypair is generated in that form). The JDK has no public API for either encoding, so both
 * directions are spelled out here.
 */
internal object WebPushEcKeys {

    private const val CURVE = "secp256r1"
    private const val KEY_ALGORITHM = "EC"

    private const val COORDINATE_LENGTH = 32
    private const val UNCOMPRESSED_POINT_TAG: Byte = 0x04

    /** An uncompressed EC point: the `0x04` tag followed by the X and Y coordinates. */
    const val UNCOMPRESSED_POINT_LENGTH = 1 + 2 * COORDINATE_LENGTH

    private val base64UrlEncoder: Base64.Encoder = Base64.getUrlEncoder().withoutPadding()
    private val base64UrlDecoder: Base64.Decoder = Base64.getUrlDecoder()

    private val curveParameters: ECParameterSpec = AlgorithmParameters.getInstance(KEY_ALGORITHM).run {
        init(ECGenParameterSpec(CURVE))
        getParameterSpec(ECParameterSpec::class.java)
    }

    fun encodeBase64Url(bytes: ByteArray): String = base64UrlEncoder.encodeToString(bytes)

    /**
     * Tolerant on purpose: the `p256dh`/`auth` values come from whatever the browser and the
     * frontend produced, and standard-alphabet base64 (`+`/`/`, with or without `=` padding) shows
     * up in the wild alongside the base64url the Push API specifies.
     */
    fun decodeBase64Url(value: String): ByteArray = base64UrlDecoder.decode(
        value.trim().replace('+', '-').replace('/', '_').trimEnd('='),
    )

    fun generateKeyPair(): KeyPair = KeyPairGenerator.getInstance(KEY_ALGORITHM).apply {
        initialize(ECGenParameterSpec(CURVE), SecureRandom())
    }.generateKeyPair()

    /**
     * Decodes an uncompressed point. [KeyFactory] rejects a point that isn't actually on the curve,
     * so a garbled key fails here rather than silently producing an undeliverable message.
     */
    fun decodePublicKey(uncompressedPoint: ByteArray): ECPublicKey {
        require(uncompressedPoint.size == UNCOMPRESSED_POINT_LENGTH && uncompressedPoint[0] == UNCOMPRESSED_POINT_TAG) {
            "Expected an uncompressed P-256 point ($UNCOMPRESSED_POINT_LENGTH bytes starting with 0x04)"
        }
        val x = BigInteger(1, uncompressedPoint.copyOfRange(1, 1 + COORDINATE_LENGTH))
        val y = BigInteger(1, uncompressedPoint.copyOfRange(1 + COORDINATE_LENGTH, UNCOMPRESSED_POINT_LENGTH))
        return KeyFactory.getInstance(KEY_ALGORITHM)
            .generatePublic(ECPublicKeySpec(ECPoint(x, y), curveParameters)) as ECPublicKey
    }

    /**
     * The scalar is read as unsigned: a raw 32-byte private key whose first bit is set would
     * otherwise decode as a negative [BigInteger], and one exported via `BigInteger.toByteArray()`
     * can carry an extra leading zero byte - both are the same value here.
     */
    fun decodePrivateKey(scalar: ByteArray): ECPrivateKey = KeyFactory.getInstance(KEY_ALGORITHM)
        .generatePrivate(ECPrivateKeySpec(BigInteger(1, scalar), curveParameters)) as ECPrivateKey

    fun encodePublicKey(publicKey: ECPublicKey): ByteArray = byteArrayOf(UNCOMPRESSED_POINT_TAG) +
        publicKey.w.affineX.toFixedLengthBytes() +
        publicKey.w.affineY.toFixedLengthBytes()

    /**
     * Left-pads to the curve's 32-byte coordinate length and drops the sign byte
     * [BigInteger.toByteArray] prepends for values with the high bit set - an EC point's
     * coordinates are fixed-width unsigned integers.
     */
    private fun BigInteger.toFixedLengthBytes(): ByteArray {
        val bytes = toByteArray()
        return when {
            bytes.size == COORDINATE_LENGTH -> bytes
            bytes.size > COORDINATE_LENGTH -> bytes.copyOfRange(bytes.size - COORDINATE_LENGTH, bytes.size)
            else -> ByteArray(COORDINATE_LENGTH - bytes.size) + bytes
        }
    }
}
