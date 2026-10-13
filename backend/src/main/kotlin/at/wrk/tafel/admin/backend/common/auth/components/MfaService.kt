package at.wrk.tafel.admin.backend.common.auth.components

import at.wrk.tafel.admin.backend.common.ExcludeFromTestCoverage
import at.wrk.tafel.admin.backend.common.auth.model.MfaMethod
import at.wrk.tafel.admin.backend.config.properties.TafelAdminProperties
import at.wrk.tafel.admin.backend.database.model.auth.UserEntity
import at.wrk.tafel.admin.backend.database.model.auth.UserRepository
import at.wrk.tafel.admin.backend.modules.base.exception.BusinessRuleException
import at.wrk.tafel.admin.backend.modules.base.exception.ConflictException
import at.wrk.tafel.admin.backend.modules.base.exception.NotFoundException
import org.slf4j.LoggerFactory
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional
import java.time.LocalDateTime

/**
 * Two-factor authentication (see ADR-0058). Three methods, which a user can have side by side - a code from an
 * authenticator app (TOTP), a code sent by e-mail, and passkeys (ADR-0070) - and any one completes a login. A
 * user opts in by setting a method up and proving it works ([startSetup]/[enable], [startEmailSetup]/
 * [enableEmail], [startPasskeySetup]/[enablePasskey]), and can switch it off again ([disable], [removePasskey]);
 * an administrator can clear all of them for someone who lost the phone ([reset]). Once a user has a method, a
 * login is only complete after [verifyLogin] or [verifyLoginWithPasskey] - see `TafelJwtAuthProvider` for how an
 * unfinished login is kept from doing anything. The deployment can also require every user to have one
 * (`tafeladmin.mfa.required`); the last method of such a user cannot be switched off.
 *
 * **A completed session proves an existing factor before it changes the second factor.** Switching a method on
 * takes proof of one the user already has, exactly like switching one off - otherwise a session left open in a
 * browser could add the attacker's own authenticator app, address or passkey next to the user's. The proof is
 * a code of a code method or the answer of one of the user's passkeys ([confirmExistingFactor]), so a user whose
 * only method is a passkey can give it too. Only a user with no method yet (the first setup) has nothing to
 * prove. The "start" calls change nothing that counts until the matching enable call, so they ask for no proof
 * - which also keeps a one-time code of the existing method from being needed twice for one setup. The same
 * rule covers the address the e-mail method sends to, see [confirm]. Every one of these changes is mailed to
 * the user ([AccountSecurityNotificationService]).
 *
 * The check is the same wherever a code is asked for ([checkCode]):
 * - **Wrong codes are counted**, per user and across all methods - a refused passkey included - in `login_attempts` under the key
 *   `mfa:<username>`, so the same lockout rule (`security.loginAttempts`) and the same admin screen apply. That is
 *   what keeps a million-code search space from being walked: a login by password resets the *login* counter, but
 *   not this one.
 * - **A code is good once.** An app code is only accepted for a later time step than the last one
 *   ([UserRepository.advanceMfaStep]), an e-mailed code is deleted when it is accepted.
 *
 * Methods answer `false` instead of throwing when a code is refused, so the failure is committed together with
 * its count - an exception would roll the count back.
 */
@Service
class MfaService(
    private val userRepository: UserRepository,
    private val totpService: TotpService,
    private val mfaEmailCodeService: MfaEmailCodeService,
    private val loginAttemptService: LoginAttemptService,
    private val properties: TafelAdminProperties,
    private val notificationService: AccountSecurityNotificationService,
    private val passkeyService: PasskeyService,
) {

    companion object {
        private val log = LoggerFactory.getLogger(MfaService::class.java)

        /** What the authenticator app shows as the account's provider. */
        private const val ISSUER = "Tafel Admin"

        /** The `login_attempts` key wrong codes are counted under - distinct from the username's own. */
        fun attemptKey(username: String) = "mfa:$username"
    }

    @Transactional(readOnly = true)
    fun getStatus(username: String): MfaStatus {
        val user = findUser(username)
        return MfaStatus(
            totpEnabled = user.mfaTotpEnabled,
            emailEnabled = user.mfaEmailEnabled,
            required = properties.mfa.required,
            emailAvailable = mfaEmailCodeService.isAvailable(),
            emailAddress = user.email?.takeIf { it.isNotBlank() },
            passkeys = passkeyService.list(user.id!!).map {
                MfaPasskey(id = it.id!!, name = it.name, createdAt = it.createdAt, lastUsedAt = it.lastUsedAt)
            },
        )
    }

    // ---- authenticator app

    /**
     * Starts (or restarts) the app setup: a new secret is stored but does not count until [enable]. A user who
     * already has the method switched on has to switch it off first, so a stolen session cannot swap the secret
     * out from under them.
     */
    @Transactional
    fun startSetup(username: String): MfaSetup {
        val user = findUser(username)
        if (user.mfaTotpEnabled) {
            throw ConflictException("Die Authenticator-App ist bereits eingerichtet!")
        }

        val secret = totpService.generateSecret()
        user.mfaSecret = secret
        userRepository.save(user)

        val label = properties.environmentLabel.takeIf { it.isNotBlank() }
        val issuer = if (label == null) ISSUER else "$ISSUER ($label)"
        return MfaSetup(secret = secret, otpauthUri = totpService.otpauthUri(issuer, user.username, secret))
    }

    /**
     * Switches the app on once [code] proves it has the secret. A user who already has a method also has to give
     * [currentCode] of it. `false` if a code is refused.
     */
    @Transactional
    fun enable(username: String, code: String, currentCode: String? = null, currentPasskey: PasskeyAnswer? = null): Boolean {
        val user = findUser(username)
        if (user.mfaTotpEnabled) {
            throw ConflictException("Die Authenticator-App ist bereits eingerichtet!")
        }
        if (user.mfaSecret == null) {
            throw BusinessRuleException("Bitte zuerst die Einrichtung starten!")
        }
        if (!confirmExistingFactor(user, currentCode, currentPasskey) || !checkCode(user, code, totp = true, email = false)) {
            return false
        }

        user.mfaTotpEnabled = true
        userRepository.save(user)
        notificationService.notify(user.username, user.email, "Die Zwei-Faktor-Authentifizierung mit einer Authenticator-App wurde eingeschaltet.")
        log.info("Two-factor authentication with an authenticator app enabled for user {}", user.username)
        return true
    }

    // ---- e-mail

    /** Sends the code that proves the address works, as the first step of switching the e-mail method on. */
    @Transactional
    fun startEmailSetup(username: String) {
        val user = findUser(username)
        if (user.mfaEmailEnabled) {
            throw ConflictException("Der Code per E-Mail ist bereits eingerichtet!")
        }
        mfaEmailCodeService.send(user)
    }

    /**
     * Switches the e-mail method on once [code] - the one just sent - was entered. A user who already has a method
     * also has to give [currentCode] of it. `false` if a code is refused.
     */
    @Transactional
    fun enableEmail(username: String, code: String, currentCode: String? = null, currentPasskey: PasskeyAnswer? = null): Boolean {
        val user = findUser(username)
        if (user.mfaEmailEnabled) {
            throw ConflictException("Der Code per E-Mail ist bereits eingerichtet!")
        }
        if (!confirmExistingFactor(user, currentCode, currentPasskey) || !checkCode(user, code, totp = false, email = true)) {
            return false
        }

        user.mfaEmailEnabled = true
        userRepository.save(user)
        notificationService.notify(user.username, user.email, "Die Zwei-Faktor-Authentifizierung per E-Mail wurde eingeschaltet.")
        log.info("Two-factor authentication by e-mail enabled for user {}", user.username)
        return true
    }

    /** Sends the code that completes a login (or switches a method off) to a user who has the e-mail method on. */
    @Transactional
    fun sendLoginCode(username: String) {
        val user = findUser(username)
        if (!user.mfaEmailEnabled) {
            throw BusinessRuleException("Der Code per E-Mail ist nicht eingerichtet!")
        }
        mfaEmailCodeService.send(user)
    }

    // ---- passkeys

    /**
     * Hands out the options the browser creates a passkey from. Like the other two "start" calls it changes
     * nothing that counts and asks for no proof - [enablePasskey] does.
     */
    @Transactional
    fun startPasskeySetup(username: String, relyingParty: PasskeyRelyingParty): Map<String, Any?> = passkeyService.startRegistration(findUser(username), relyingParty)

    /**
     * Adds the passkey the browser created for [startPasskeySetup]'s options, under [name]. A user who already
     * has a method also has to prove one ([currentCode] or [currentPasskey]). The new passkey is looked at first
     * and the proof second, so a registration the browser got wrong does not use a one-time code up.
     */
    @Transactional
    fun enablePasskey(
        username: String,
        relyingParty: PasskeyRelyingParty,
        credentialJson: String,
        name: String,
        currentCode: String? = null,
        currentPasskey: PasskeyAnswer? = null,
    ): PasskeyEnableResult {
        val user = findUser(username)

        val verified = passkeyService.verifyRegistration(user, relyingParty, credentialJson) ?: return PasskeyEnableResult.PASSKEY_REFUSED
        if (!confirmExistingFactor(user, currentCode, currentPasskey)) {
            return PasskeyEnableResult.PROOF_REFUSED
        }

        val passkey = passkeyService.save(user, verified, name)
        user.mfaPasskeyEnabled = true
        userRepository.save(user)
        notificationService.notify(user.username, user.email, "Der Passkey \"${passkey.name}\" wurde für die Zwei-Faktor-Authentifizierung hinzugefügt.")
        log.info("Passkey added for user {}", user.username)
        return PasskeyEnableResult.ENABLED
    }

    /**
     * Removes one passkey of the user, who has to prove a method they have to do so - with a code, or with a
     * passkey (the one being removed will do). `false` if the proof is refused or the user has no such passkey.
     * Refused, without looking at the proof, when it is the last method of a user the deployment requires one of.
     */
    @Transactional
    fun removePasskey(username: String, passkeyId: Long, code: String?, passkey: PasskeyAnswer? = null): Boolean {
        val user = findUser(username)
        val passkeys = passkeyService.list(user.id!!)
        if (passkeys.none { it.id == passkeyId }) {
            return false
        }
        if (passkeys.size == 1 && !user.mfaTotpEnabled && !user.mfaEmailEnabled && properties.mfa.required) {
            throw lastMethodRequired()
        }
        if (!confirmExistingFactor(user, code, passkey)) {
            return false
        }

        val removed = passkeyService.remove(user, passkeyId) ?: return false
        user.mfaPasskeyEnabled = passkeys.size > 1
        userRepository.save(user)
        notificationService.notify(user.username, user.email, "Der Passkey \"${removed.name}\" wurde entfernt.")
        log.info("Passkey removed by user {}", user.username)
        return true
    }

    /**
     * Hands out the options the browser asks one of the user's passkeys with - for a login that owes its second
     * step, or for a completed session that proves a method it has before changing one.
     */
    @Transactional
    fun startPasskeyAssertion(username: String, relyingParty: PasskeyRelyingParty): Map<String, Any?> {
        val user = findUser(username)
        if (!user.mfaPasskeyEnabled) {
            throw BusinessRuleException("Es ist kein Passkey eingerichtet!")
        }
        return passkeyService.startAuthentication(user, relyingParty)
    }

    /** The second step of a login with a passkey. `false` if it is refused, or there is none to use. */
    @Transactional
    fun verifyLoginWithPasskey(username: String, passkey: PasskeyAnswer): Boolean = checkPasskey(findUser(username), passkey)

    // ---- login and switching off

    /** The second step of a login, with a code from either code method. `false` if it is refused, or there is none to give. */
    @Transactional
    fun verifyLogin(username: String, code: String): Boolean {
        val user = findUser(username)
        return user.hasMfa && checkCode(user, code, totp = user.mfaTotpEnabled, email = user.mfaEmailEnabled)
    }

    /**
     * Whether [code] is a valid code of a method [username] has on - what a completed session has to show before
     * it changes what the second factor is (the e-mail address a code goes to, see `UserController.updateAccount`).
     * `false` when the user has no method at all, since there is then no code to give.
     */
    @Transactional
    fun confirm(username: String, code: String?): Boolean {
        val user = findUser(username)
        return user.hasMfa && confirmExistingFactor(user, code)
    }

    /**
     * Switches [method] off for the user themselves, who has to prove *any* of the methods they have to do so -
     * a session left open in a browser cannot take the second factor away. Refused, without looking at the
     * proof, when this is the last method the user has and the deployment requires one.
     */
    @Transactional
    fun disable(username: String, method: MfaMethod, code: String?, passkey: PasskeyAnswer? = null): Boolean {
        val user = findUser(username)
        val enabled = when (method) {
            MfaMethod.TOTP -> user.mfaTotpEnabled
            MfaMethod.EMAIL -> user.mfaEmailEnabled
        }
        if (!enabled) {
            return false
        }

        val otherEnabled = user.mfaPasskeyEnabled ||
            when (method) {
                MfaMethod.TOTP -> user.mfaEmailEnabled
                MfaMethod.EMAIL -> user.mfaTotpEnabled
            }
        if (!otherEnabled && properties.mfa.required) {
            throw lastMethodRequired()
        }
        if (!confirmExistingFactor(user, code, passkey)) {
            return false
        }

        when (method) {
            MfaMethod.TOTP -> clearTotp(user)
            MfaMethod.EMAIL -> clearEmail(user)
        }
        userRepository.save(user)
        log.info("Two-factor authentication method {} disabled by user {}", method, user.username)
        val what = when (method) {
            MfaMethod.TOTP -> "mit einer Authenticator-App"
            MfaMethod.EMAIL -> "per E-Mail"
        }
        notificationService.notify(user.username, user.email, "Die Zwei-Faktor-Authentifizierung $what wurde ausgeschaltet.")
        return true
    }

    /**
     * Switches every method off - the passkeys are removed - for [userId] without a proof: an administrator's
     * answer to a lost phone or device. When the deployment requires a second factor the user has to set one up
     * again at the next request.
     */
    @Transactional
    fun reset(userId: Long) {
        val user = userRepository.findById(userId).orElseThrow { NotFoundException("Benutzer (ID: $userId) nicht vorhanden!") }
        clearTotp(user)
        clearEmail(user)
        passkeyService.removeAll(user)
        user.mfaPasskeyEnabled = false
        userRepository.save(user)
        loginAttemptService.deleteAttempts(attemptKey(user.username))
        log.info("Two-factor authentication of user {} was reset by an administrator", user.username)
        notificationService.notify(user.username, user.email, "Die Zwei-Faktor-Authentifizierung wurde von einem Administrator zurückgesetzt.")
    }

    private fun clearTotp(user: UserEntity) {
        user.mfaTotpEnabled = false
        user.mfaSecret = null
        userRepository.clearMfaStep(user.id!!)
    }

    private fun clearEmail(user: UserEntity) {
        user.mfaEmailEnabled = false
        mfaEmailCodeService.discard(user.id!!)
    }

    private fun lastMethodRequired() = ConflictException("Eine Zwei-Faktor-Authentifizierung ist verpflichtend - die letzte Methode kann nicht ausgeschaltet werden!")

    /**
     * Whether the user has proven a method they already have, with [code] or with the answer of one of their
     * passkeys - trivially so while they have none, which is the first setup. A missing proof is refused without
     * counting as a failure: nothing was guessed.
     */
    private fun confirmExistingFactor(user: UserEntity, code: String?, passkey: PasskeyAnswer? = null): Boolean = when {
        !user.hasMfa -> true
        passkey != null -> checkPasskey(user, passkey)
        code.isNullOrBlank() -> false
        else -> checkCode(user, code, totp = user.mfaTotpEnabled, email = user.mfaEmailEnabled)
    }

    /** Whether [passkey] is a valid answer of one of the user's passkeys - counted like a code, see [countingFailures]. */
    private fun checkPasskey(user: UserEntity, passkey: PasskeyAnswer): Boolean = user.mfaPasskeyEnabled &&
        countingFailures(user) { passkeyService.verifyAuthentication(user, passkey.relyingParty, passkey.credentialJson) }

    /**
     * Whether [code] is a valid code of a method [totp]/[email] allow for - the app's for the secret (which need not
     * be switched on yet, that is what proves it), or the e-mailed one. One wrong code is one failure, however many
     * methods it was tried against.
     */
    private fun checkCode(user: UserEntity, code: String, totp: Boolean, email: Boolean): Boolean = countingFailures(user) {
        var accepted = false
        if (totp) {
            val step = user.mfaSecret?.let { totpService.matchingStep(it, code) }
            accepted = step != null && userRepository.advanceMfaStep(user.id!!, step) == 1
        }
        if (!accepted && email) {
            accepted = mfaEmailCodeService.consume(user.id!!, code)
        }
        accepted
    }

    /**
     * Runs [check] - unless the user is locked out, which refuses without looking - and counts its outcome: a
     * refusal is one more failure, an acceptance clears the count.
     */
    private fun countingFailures(user: UserEntity, check: () -> Boolean): Boolean {
        val key = attemptKey(user.username)
        if (loginAttemptService.isLocked(key)) {
            return false
        }

        if (!check()) {
            loginAttemptService.recordFailure(key)
            return false
        }
        loginAttemptService.deleteAttempts(key)
        return true
    }

    private fun findUser(username: String): UserEntity = userRepository.findByUsername(username) ?: throw NotFoundException("Benutzer nicht gefunden!")
}

@ExcludeFromTestCoverage
data class MfaSetup(
    val secret: String,
    val otpauthUri: String,
)

@ExcludeFromTestCoverage
data class MfaStatus(
    val totpEnabled: Boolean,
    val emailEnabled: Boolean,
    /** Whether the deployment requires every user to have a second factor. */
    val required: Boolean,
    /** Whether a mail can be sent at all, i.e. whether the e-mail method can be offered. */
    val emailAvailable: Boolean,
    /** Where a code by e-mail goes - the address on the account; null when none is on record. */
    val emailAddress: String? = null,
    val passkeys: List<MfaPasskey> = emptyList(),
)

/** One passkey as its owner sees it: what they called it, and when it was added and last used. */
@ExcludeFromTestCoverage
data class MfaPasskey(
    val id: Long,
    val name: String,
    val createdAt: LocalDateTime?,
    val lastUsedAt: LocalDateTime?,
)

/** How adding a passkey ended - the two refusals are told apart because the user has to redo different things. */
enum class PasskeyEnableResult {
    ENABLED,

    /** The new passkey itself did not pass verification. */
    PASSKEY_REFUSED,

    /** The proof of a method the user already has was refused. */
    PROOF_REFUSED,
}

/** What a browser sent back for a passkey challenge, and the site it was sent to. */
@ExcludeFromTestCoverage
data class PasskeyAnswer(
    val relyingParty: PasskeyRelyingParty,
    val credentialJson: String,
)
