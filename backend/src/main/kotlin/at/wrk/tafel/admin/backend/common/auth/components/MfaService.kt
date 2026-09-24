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

/**
 * Two-factor authentication (see ADR-0058). Two methods, which a user can switch on side by side - a code from an
 * authenticator app (TOTP) and a code sent by e-mail - and either one completes a login. A user opts in by
 * setting a method up and proving it works ([startSetup]/[enable], [startEmailSetup]/[enableEmail]), and can
 * switch a method off again with a code ([disable]); an administrator can clear both for someone who lost the
 * phone ([reset]). Once a user has a method, a login is only complete after [verifyLogin] - see
 * `TafelJwtAuthProvider` for how an unfinished login is kept from doing anything. The deployment can also
 * require every user to have one (`tafeladmin.mfa.required`); the last method of such a user cannot be
 * switched off.
 *
 * The check is the same wherever a code is asked for ([checkCode]):
 * - **Wrong codes are counted**, per user and across both methods, in `login_attempts` under the key
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

    /** Switches the app on once [code] proves it has the secret. `false` if the code is refused. */
    @Transactional
    fun enable(username: String, code: String): Boolean {
        val user = findUser(username)
        if (user.mfaTotpEnabled) {
            throw ConflictException("Die Authenticator-App ist bereits eingerichtet!")
        }
        if (user.mfaSecret == null) {
            throw BusinessRuleException("Bitte zuerst die Einrichtung starten!")
        }
        if (!checkCode(user, code, totp = true, email = false)) {
            return false
        }

        user.mfaTotpEnabled = true
        userRepository.save(user)
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

    /** Switches the e-mail method on once [code] - the one just sent - was entered. `false` if it is refused. */
    @Transactional
    fun enableEmail(username: String, code: String): Boolean {
        val user = findUser(username)
        if (user.mfaEmailEnabled) {
            throw ConflictException("Der Code per E-Mail ist bereits eingerichtet!")
        }
        if (!checkCode(user, code, totp = false, email = true)) {
            return false
        }

        user.mfaEmailEnabled = true
        userRepository.save(user)
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

    // ---- login and switching off

    /** The second step of a login, with a code from either method. `false` if it is refused, or there is none to give. */
    @Transactional
    fun verifyLogin(username: String, code: String): Boolean {
        val user = findUser(username)
        return user.hasMfa && checkCode(user, code, totp = user.mfaTotpEnabled, email = user.mfaEmailEnabled)
    }

    /**
     * Switches [method] off for the user themselves, who has to give a valid code of *either* of the methods they
     * have to do so - a session left open in a browser cannot take the second factor away. Refused, without
     * looking at the code, when the deployment requires one and this is the last method the user has.
     */
    @Transactional
    fun disable(username: String, method: MfaMethod, code: String): Boolean {
        val user = findUser(username)
        val enabled = when (method) {
            MfaMethod.TOTP -> user.mfaTotpEnabled
            MfaMethod.EMAIL -> user.mfaEmailEnabled
        }
        if (!enabled) {
            return false
        }

        val otherEnabled = when (method) {
            MfaMethod.TOTP -> user.mfaEmailEnabled
            MfaMethod.EMAIL -> user.mfaTotpEnabled
        }
        if (!otherEnabled && properties.mfa.required) {
            throw ConflictException("Eine Zwei-Faktor-Authentifizierung ist verpflichtend - die letzte Methode kann nicht ausgeschaltet werden!")
        }
        if (!checkCode(user, code, totp = user.mfaTotpEnabled, email = user.mfaEmailEnabled)) {
            return false
        }

        when (method) {
            MfaMethod.TOTP -> clearTotp(user)
            MfaMethod.EMAIL -> clearEmail(user)
        }
        userRepository.save(user)
        log.info("Two-factor authentication method {} disabled by user {}", method, user.username)
        return true
    }

    /**
     * Switches both methods off for [userId] without a code - an administrator's answer to a lost phone. When the
     * deployment requires a second factor the user has to set one up again at the next request.
     */
    @Transactional
    fun reset(userId: Long) {
        val user = userRepository.findById(userId).orElseThrow { NotFoundException("Benutzer (ID: $userId) nicht vorhanden!") }
        clearTotp(user)
        clearEmail(user)
        userRepository.save(user)
        loginAttemptService.deleteAttempts(attemptKey(user.username))
        log.info("Two-factor authentication of user {} was reset by an administrator", user.username)
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

    /**
     * Whether [code] is a valid code of a method [totp]/[email] allow for - the app's for the secret (which need not
     * be switched on yet, that is what proves it), or the e-mailed one. One wrong code is one failure, however many
     * methods it was tried against.
     */
    private fun checkCode(user: UserEntity, code: String, totp: Boolean, email: Boolean): Boolean {
        val key = attemptKey(user.username)
        if (loginAttemptService.isLocked(key)) {
            return false
        }

        var accepted = false
        if (totp) {
            val step = user.mfaSecret?.let { totpService.matchingStep(it, code) }
            accepted = step != null && userRepository.advanceMfaStep(user.id!!, step) == 1
        }
        if (!accepted && email) {
            accepted = mfaEmailCodeService.consume(user.id!!, code)
        }

        if (!accepted) {
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
)
