package at.wrk.tafel.admin.backend.common.auth

import com.webauthn4j.data.AttestationConveyancePreference
import com.webauthn4j.data.AuthenticatorSelectionCriteria
import com.webauthn4j.data.PublicKeyCredentialCreationOptions
import com.webauthn4j.data.PublicKeyCredentialDescriptor
import com.webauthn4j.data.PublicKeyCredentialParameters
import com.webauthn4j.data.PublicKeyCredentialRequestOptions
import com.webauthn4j.data.PublicKeyCredentialRpEntity
import com.webauthn4j.data.PublicKeyCredentialType
import com.webauthn4j.data.PublicKeyCredentialUserEntity
import com.webauthn4j.data.ResidentKeyRequirement
import com.webauthn4j.data.UserVerificationRequirement
import com.webauthn4j.data.attestation.statement.COSEAlgorithmIdentifier
import com.webauthn4j.data.client.Origin
import com.webauthn4j.data.client.challenge.DefaultChallenge
import com.webauthn4j.test.authenticator.webauthn.NoneAttestationAuthenticator
import com.webauthn4j.test.authenticator.webauthn.WebAuthnAuthenticatorAdaptor
import com.webauthn4j.test.client.ClientPlatform
import tools.jackson.databind.json.JsonMapper
import java.util.Base64

/**
 * A browser with one software authenticator, for tests: it answers the options the backend hands out the way
 * `navigator.credentials.create()`/`.get()` followed by `toJSON()` would, with real keys and real signatures.
 * [origin] is the page it claims to be on.
 */
class TestPasskeyAuthenticator(origin: String = "http://localhost:4200") {

    private val clientPlatform = ClientPlatform(Origin(origin), WebAuthnAuthenticatorAdaptor(NoneAttestationAuthenticator()))
    private val jsonMapper = JsonMapper()
    private val encoder = Base64.getUrlEncoder().withoutPadding()
    private val decoder = Base64.getUrlDecoder()

    /** Creates a passkey for the registration [options] and returns the credential as JSON. */
    fun create(options: Map<String, Any?>): String {
        val rp = options["rp"] as Map<*, *>
        val user = options["user"] as Map<*, *>
        val credential = clientPlatform.create(
            PublicKeyCredentialCreationOptions(
                PublicKeyCredentialRpEntity(rp["id"] as String, rp["name"] as String),
                PublicKeyCredentialUserEntity(decoder.decode(user["id"] as String), user["name"] as String, user["displayName"] as String),
                DefaultChallenge(options["challenge"] as String),
                listOf(PublicKeyCredentialParameters(PublicKeyCredentialType.PUBLIC_KEY, COSEAlgorithmIdentifier.ES256)),
                null,
                emptyList(),
                AuthenticatorSelectionCriteria(null, ResidentKeyRequirement.DISCOURAGED, UserVerificationRequirement.PREFERRED),
                AttestationConveyancePreference.NONE,
                null,
            ),
        )
        return jsonMapper.writeValueAsString(
            mapOf(
                "id" to encoder.encodeToString(credential.rawId),
                "rawId" to encoder.encodeToString(credential.rawId),
                "type" to "public-key",
                "response" to mapOf(
                    "clientDataJSON" to encoder.encodeToString(credential.response!!.clientDataJSON),
                    "attestationObject" to encoder.encodeToString(credential.response!!.attestationObject),
                    "transports" to listOf("internal"),
                ),
                "clientExtensionResults" to emptyMap<String, Any>(),
            ),
        )
    }

    /** Signs the login [options] with the passkey they allow and returns the assertion as JSON. */
    fun get(options: Map<String, Any?>): String {
        val allowCredentials = (options["allowCredentials"] as List<*>).map {
            PublicKeyCredentialDescriptor(PublicKeyCredentialType.PUBLIC_KEY, decoder.decode((it as Map<*, *>)["id"] as String), null)
        }
        val credential = clientPlatform.get(
            PublicKeyCredentialRequestOptions(
                DefaultChallenge(options["challenge"] as String),
                null,
                options["rpId"] as String,
                allowCredentials,
                UserVerificationRequirement.PREFERRED,
                null,
            ),
        )
        val response = credential.response!!
        return jsonMapper.writeValueAsString(
            mapOf(
                "id" to encoder.encodeToString(credential.rawId),
                "rawId" to encoder.encodeToString(credential.rawId),
                "type" to "public-key",
                "response" to mapOf(
                    "clientDataJSON" to encoder.encodeToString(response.clientDataJSON),
                    "authenticatorData" to encoder.encodeToString(response.authenticatorData),
                    "signature" to encoder.encodeToString(response.signature),
                    "userHandle" to response.userHandle?.let { encoder.encodeToString(it) },
                ),
                "clientExtensionResults" to emptyMap<String, Any>(),
            ),
        )
    }
}
