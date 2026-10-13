package at.wrk.tafel.admin.backend.common.auth.components

import at.wrk.tafel.admin.backend.common.ExcludeFromTestCoverage
import at.wrk.tafel.admin.backend.config.properties.TafelAdminProperties
import at.wrk.tafel.admin.backend.database.model.auth.PasskeyChallengeEntity
import at.wrk.tafel.admin.backend.database.model.auth.PasskeyChallengePurpose
import at.wrk.tafel.admin.backend.database.model.auth.PasskeyChallengeRepository
import at.wrk.tafel.admin.backend.database.model.auth.UserEntity
import at.wrk.tafel.admin.backend.database.model.auth.UserPasskeyEntity
import at.wrk.tafel.admin.backend.database.model.auth.UserPasskeyRepository
import at.wrk.tafel.admin.backend.modules.base.exception.ConflictException
import com.webauthn4j.WebAuthnManager
import com.webauthn4j.converter.AttestedCredentialDataConverter
import com.webauthn4j.converter.util.ObjectConverter
import com.webauthn4j.credential.CredentialRecordImpl
import com.webauthn4j.data.AuthenticationParameters
import com.webauthn4j.data.AuthenticatorTransport
import com.webauthn4j.data.PublicKeyCredentialParameters
import com.webauthn4j.data.PublicKeyCredentialType
import com.webauthn4j.data.RegistrationParameters
import com.webauthn4j.data.attestation.statement.COSEAlgorithmIdentifier
import com.webauthn4j.data.attestation.statement.NoneAttestationStatement
import com.webauthn4j.data.client.Origin
import com.webauthn4j.data.client.challenge.DefaultChallenge
import com.webauthn4j.server.ServerProperty
import jakarta.servlet.http.HttpServletRequest
import org.slf4j.LoggerFactory
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional
import java.security.MessageDigest
import java.security.SecureRandom
import java.time.Clock
import java.time.LocalDateTime
import java.util.Base64

/**
 * Passkeys (WebAuthn credentials) as a way to complete the second step of a login - see ADR-0070. This class is
 * the WebAuthn part only: it hands out the options a browser needs for a ceremony, remembers the challenge in
 * between, and verifies what the browser sends back. Who may register, use or remove a passkey, what a failure
 * counts for and who is told is [MfaService]'s business, like for the other methods.
 *
 * - **The challenge lives in the database** (`passkey_challenges`), one per user and purpose: there is no
 *   server-side session, and during a deploy the answer may reach another instance than the one that issued it.
 *   It is deleted by the request that answers it, valid or not, and expires after
 *   `tafeladmin.mfa.passkey.challengeValidity`.
 * - **The relying party is the site the request came in on** ([PasskeyRelyingParty]), so passkeys need no
 *   configuration and work on every deployment. A passkey is bound to the RP ID by the browser and the
 *   authenticator; the origin check here is the server's half of it.
 * - **No attestation is asked for.** Which make of authenticator a user has is not something this application
 *   has a rule about, so the registration is verified for what matters - challenge, origin, RP ID - and only
 *   the credential's public key is kept.
 * - **A second factor, so the user is known.** The options list exactly the user's own credentials, and an
 *   assertion is only looked up among them - a passkey of somebody else's account is simply not found.
 * - **Whatever goes wrong with an answer is a refusal.** The answer is input from the browser, and webauthn4j
 *   reports a failed check as a `WebAuthnException` but an answer that is not shaped like one as whatever the
 *   first missing field throws. Both verifications therefore catch `RuntimeException`: neither is a server error.
 *
 * Dev, test and prod share one domain and so one RP ID. The user handle is therefore derived from the
 * environment label as well as the user id: an authenticator keeps one credential per RP ID and user handle,
 * and registering on test must not replace the passkey for prod.
 */
@Service
class PasskeyService(
    private val userPasskeyRepository: UserPasskeyRepository,
    private val passkeyChallengeRepository: PasskeyChallengeRepository,
    private val properties: TafelAdminProperties,
    private val clock: Clock,
) {

    companion object {
        private val log = LoggerFactory.getLogger(PasskeyService::class.java)
        private val secureRandom = SecureRandom()
        private val base64Url = Base64.getUrlEncoder().withoutPadding()

        private const val RP_NAME = "Tafel Admin"
        private const val CHALLENGE_BYTES = 32
        private const val PUBLIC_KEY = "public-key"

        /** More than anyone has devices - a bound so the list, and the options sent on every login, stay small. */
        const val MAX_PASSKEYS_PER_USER = 10

        /** ES256, EdDSA and RS256 - what platform authenticators and security keys in use today offer. */
        private val algorithms = listOf(COSEAlgorithmIdentifier.ES256, COSEAlgorithmIdentifier.EdDSA, COSEAlgorithmIdentifier.RS256)
    }

    private val objectConverter = ObjectConverter()
    private val webAuthnManager = WebAuthnManager.createNonStrictWebAuthnManager(objectConverter)
    private val attestedCredentialDataConverter = AttestedCredentialDataConverter(objectConverter)

    @Transactional(readOnly = true)
    fun list(userId: Long): List<UserPasskeyEntity> = userPasskeyRepository.findAllByUserIdOrderByCreatedAtAsc(userId)

    /**
     * The options for `navigator.credentials.create()`, as the JSON the browser parses. The user's existing
     * passkeys are excluded, so the same authenticator is not registered twice.
     */
    @Transactional
    fun startRegistration(user: UserEntity, relyingParty: PasskeyRelyingParty): Map<String, Any?> {
        val existing = list(user.id!!)
        if (existing.size >= MAX_PASSKEYS_PER_USER) {
            throw ConflictException("Es können höchstens $MAX_PASSKEYS_PER_USER Passkeys eingerichtet werden!")
        }

        val label = properties.environmentLabel.takeIf { it.isNotBlank() }
        return mapOf(
            "rp" to mapOf("id" to relyingParty.id, "name" to RP_NAME),
            "user" to mapOf(
                "id" to userHandle(user),
                // What the authenticator lists the passkey under - with the environment, since all of them
                // share one RP ID and would otherwise show as identical entries.
                "name" to if (label == null) user.username else "${user.username} ($label)",
                "displayName" to "${user.firstname} ${user.lastname}",
            ),
            "challenge" to newChallenge(user, PasskeyChallengePurpose.REGISTRATION),
            "pubKeyCredParams" to algorithms.map { mapOf("type" to PUBLIC_KEY, "alg" to it.value) },
            "timeout" to properties.mfa.passkey.challengeValidity.toMillis(),
            "attestation" to "none",
            "excludeCredentials" to existing.map(::descriptor),
            "authenticatorSelection" to mapOf("residentKey" to "discouraged", "userVerification" to "preferred"),
        )
    }

    /**
     * Verifies the browser's answer to [startRegistration] and uses the challenge up. `null` when it is refused -
     * nothing is stored either way, that is [save]'s job once the caller has decided the passkey may be added.
     */
    @Transactional
    fun verifyRegistration(user: UserEntity, relyingParty: PasskeyRelyingParty, credentialJson: String): VerifiedPasskey? {
        val serverProperty = consumeChallenge(user, relyingParty, PasskeyChallengePurpose.REGISTRATION) ?: return null

        return try {
            val parameters = RegistrationParameters(
                serverProperty,
                algorithms.map { PublicKeyCredentialParameters(PublicKeyCredentialType.PUBLIC_KEY, it) },
                false,
                true,
            )
            val data = webAuthnManager.verifyRegistrationResponseJSON(credentialJson, parameters)
            val authenticatorData = data.attestationObject!!.authenticatorData
            val attestedCredentialData = authenticatorData.attestedCredentialData!!
            VerifiedPasskey(
                credentialId = base64Url.encodeToString(attestedCredentialData.credentialId),
                attestedCredentialData = attestedCredentialDataConverter.convert(attestedCredentialData),
                transports = data.transports?.map { it.value }?.sorted()?.joinToString(",")?.takeIf { it.isNotEmpty() },
                signCount = authenticatorData.signCount,
            )
        } catch (e: RuntimeException) {
            log.info("Passkey registration of user {} refused: {}", user.username, e.message)
            null
        }
    }

    @Transactional
    fun save(user: UserEntity, verified: VerifiedPasskey, name: String): UserPasskeyEntity {
        if (userPasskeyRepository.existsByCredentialId(verified.credentialId)) {
            throw ConflictException("Dieser Passkey ist bereits eingerichtet!")
        }
        return userPasskeyRepository.save(
            UserPasskeyEntity(
                user = user,
                credentialId = verified.credentialId,
                name = name.trim(),
                attestedCredentialData = verified.attestedCredentialData,
                transports = verified.transports,
                signCount = verified.signCount,
            ),
        )
    }

    /** The options for `navigator.credentials.get()`, listing exactly the user's own passkeys. */
    @Transactional
    fun startAuthentication(user: UserEntity, relyingParty: PasskeyRelyingParty): Map<String, Any?> = mapOf(
        "challenge" to newChallenge(user, PasskeyChallengePurpose.AUTHENTICATION),
        "rpId" to relyingParty.id,
        "timeout" to properties.mfa.passkey.challengeValidity.toMillis(),
        "userVerification" to "preferred",
        "allowCredentials" to list(user.id!!).map(::descriptor),
    )

    /** Whether the browser's answer to [startAuthentication] is a valid assertion of one of the user's passkeys. */
    @Transactional
    fun verifyAuthentication(user: UserEntity, relyingParty: PasskeyRelyingParty, credentialJson: String): Boolean {
        val serverProperty = consumeChallenge(user, relyingParty, PasskeyChallengePurpose.AUTHENTICATION) ?: return false

        return try {
            val data = webAuthnManager.parseAuthenticationResponseJSON(credentialJson)
            val passkey = userPasskeyRepository.findByUserIdAndCredentialId(user.id!!, base64Url.encodeToString(data.credentialId))
                ?: return false
            val credentialRecord = CredentialRecordImpl(
                NoneAttestationStatement(),
                null,
                null,
                null,
                passkey.signCount,
                attestedCredentialDataConverter.convert(passkey.attestedCredentialData),
                null,
                null,
                null,
                passkey.transports?.split(",")?.map { AuthenticatorTransport.create(it) }?.toSet(),
            )
            webAuthnManager.verify(data, AuthenticationParameters(serverProperty, credentialRecord, null, false, true))
            userPasskeyRepository.recordUse(passkey.id!!, data.authenticatorData!!.signCount, LocalDateTime.now(clock))
            true
        } catch (e: RuntimeException) {
            log.info("Passkey assertion of user {} refused: {}", user.username, e.message)
            false
        }
    }

    /** Removes the passkey [passkeyId] of [user]; `null` when the user has no such passkey. */
    @Transactional
    fun remove(user: UserEntity, passkeyId: Long): UserPasskeyEntity? {
        val passkey = userPasskeyRepository.findByIdAndUserId(passkeyId, user.id!!) ?: return null
        userPasskeyRepository.delete(passkey)
        return passkey
    }

    /** Removes every passkey of [user], one entity at a time so each removal is in the audit trail. */
    @Transactional
    fun removeAll(user: UserEntity) {
        userPasskeyRepository.deleteAll(list(user.id!!))
        PasskeyChallengePurpose.entries.forEach { passkeyChallengeRepository.deleteAllByUserIdAndPurpose(user.id!!, it.name) }
    }

    private fun newChallenge(user: UserEntity, purpose: PasskeyChallengePurpose): String {
        val now = LocalDateTime.now(clock)
        passkeyChallengeRepository.deleteAllExpiredSkipLocked(now)
        passkeyChallengeRepository.deleteAllByUserIdAndPurpose(user.id!!, purpose.name)

        val challenge = base64Url.encodeToString(ByteArray(CHALLENGE_BYTES).also { secureRandom.nextBytes(it) })
        passkeyChallengeRepository.save(PasskeyChallengeEntity(user, purpose, challenge, now.plus(properties.mfa.passkey.challengeValidity)))
        return challenge
    }

    /** What an answer is verified against - `null` when no ceremony is pending. The challenge is gone afterwards. */
    private fun consumeChallenge(user: UserEntity, relyingParty: PasskeyRelyingParty, purpose: PasskeyChallengePurpose): ServerProperty? {
        val pending = passkeyChallengeRepository.findByUserIdAndPurpose(user.id!!, purpose) ?: return null
        passkeyChallengeRepository.deleteAllByUserIdAndPurpose(user.id!!, purpose.name)
        if (pending.expiresAt.isBefore(LocalDateTime.now(clock))) {
            return null
        }

        return ServerProperty.builder()
            .origin(Origin(relyingParty.origin))
            .rpId(relyingParty.id)
            .challenge(DefaultChallenge(pending.challenge))
            .build()
    }

    private fun descriptor(passkey: UserPasskeyEntity): Map<String, Any?> = mapOf(
        "type" to PUBLIC_KEY,
        "id" to passkey.credentialId,
        "transports" to (passkey.transports?.split(",") ?: emptyList()),
    )

    private fun userHandle(user: UserEntity): String = base64Url.encodeToString(
        MessageDigest.getInstance("SHA-256").digest("tafel-admin:${properties.environmentLabel}:${user.id}".toByteArray(Charsets.UTF_8)),
    )
}

/**
 * The site a passkey ceremony runs on, as the request that carries it says: [id] is the host name the browser
 * binds the passkey to, [origin] the address an answer has to come from (scheme, host and, if not the scheme's
 * default, port).
 *
 * It is read from the request rather than configured, so it is whatever the reverse proxy passes on as `Host`,
 * `X-Forwarded-Proto` and `X-Forwarded-Port` (`server.forward-headers-strategy`) - the same facts the session
 * cookie's `Secure` flag already rests on. A request that names another site gets nowhere with it: a browser
 * only lets a page use the passkeys of its own domain, so the user's passkeys do not answer for that site.
 */
data class PasskeyRelyingParty(val id: String, val origin: String) {

    companion object {
        private val defaultPorts = mapOf("http" to 80, "https" to 443)

        fun of(request: HttpServletRequest): PasskeyRelyingParty {
            val port = request.serverPort.takeIf { it != defaultPorts[request.scheme] }
            return PasskeyRelyingParty(
                id = request.serverName,
                origin = "${request.scheme}://${request.serverName}" + (port?.let { ":$it" } ?: ""),
            )
        }
    }
}

/** A registration that passed verification and is not stored yet. */
@ExcludeFromTestCoverage
class VerifiedPasskey(
    val credentialId: String,
    val attestedCredentialData: ByteArray,
    val transports: String?,
    val signCount: Long,
)
