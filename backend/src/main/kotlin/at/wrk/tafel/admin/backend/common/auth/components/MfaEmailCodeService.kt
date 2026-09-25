package at.wrk.tafel.admin.backend.common.auth.components

import at.wrk.tafel.admin.backend.common.mail.MailSenderService
import at.wrk.tafel.admin.backend.config.properties.TafelAdminProperties
import at.wrk.tafel.admin.backend.database.model.auth.MfaEmailCodeEntity
import at.wrk.tafel.admin.backend.database.model.auth.MfaEmailCodeRepository
import at.wrk.tafel.admin.backend.database.model.auth.UserEntity
import at.wrk.tafel.admin.backend.modules.base.exception.BusinessRuleException
import at.wrk.tafel.admin.backend.modules.base.exception.TafelApiException
import org.slf4j.LoggerFactory
import org.springframework.http.HttpStatus
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional
import org.thymeleaf.context.Context
import java.security.MessageDigest
import java.security.SecureRandom
import java.time.Clock
import java.time.LocalDateTime

/**
 * The e-mail method of two-factor authentication (see ADR-0058): a 6-digit code sent to the address on the
 * account, used to switch the method on ([MfaService.startEmailSetup]/[MfaService.enableEmail]) and to complete a
 * login ([MfaService.sendLoginCode]/[MfaService.verifyLogin]).
 *
 * - **One live code per user.** Asking for a new one replaces the earlier, and only after
 *   `tafeladmin.mfa.emailCodeCooldown` - otherwise the endpoint would be a way to fill somebody's mailbox.
 * - **Single-use and short-lived.** A code is deleted when it is accepted, and expires after
 *   `tafeladmin.mfa.emailCodeValidity`. Expired rows are deleted by whichever request comes next.
 * - **Bound to its login.** A password login discards the code that is outstanding ([discard], called by
 *   `TafelLoginFilter`), so a code sent for a login that was never finished cannot complete the next one.
 * - **Only a hash is stored.** A six-digit code can be brute-forced from its hash, so this is defence in depth
 *   rather than a barrier - what stops a guessing attack is the per-user count of wrong codes in [MfaService].
 *
 * It is only available where a mail can be sent at all (`tafeladmin.mail`).
 */
@Service
class MfaEmailCodeService(
    private val mfaEmailCodeRepository: MfaEmailCodeRepository,
    private val mailSenderService: MailSenderService,
    private val tafelAdminProperties: TafelAdminProperties,
    private val clock: Clock,
) {

    companion object {
        private val logger = LoggerFactory.getLogger(MfaEmailCodeService::class.java)
        private val secureRandom = SecureRandom()
        private const val CODE_DIGITS = 6
        private const val CODE_BOUND = 1_000_000

        fun hash(userId: Long, code: String): String = MessageDigest.getInstance("SHA-256")
            .digest("$userId:$code".toByteArray(Charsets.UTF_8))
            .joinToString("") { "%02x".format(it) }
    }

    fun isAvailable(): Boolean = tafelAdminProperties.mail != null

    /** Sends a fresh code to [user]'s address, replacing the one that is outstanding. */
    @Transactional
    fun send(user: UserEntity) {
        if (!isAvailable()) {
            throw BusinessRuleException("Der Versand von E-Mails ist auf diesem System nicht eingerichtet!")
        }
        val address = user.email
        if (address.isNullOrBlank()) {
            throw BusinessRuleException("Für dieses Benutzerkonto ist keine E-Mail-Adresse hinterlegt!")
        }

        val now = LocalDateTime.now(clock)
        val mfa = tafelAdminProperties.mfa
        mfaEmailCodeRepository.deleteAllExpiredSkipLocked(now)

        val outstanding = mfaEmailCodeRepository.findByUserId(user.id!!)
        if (outstanding?.createdAt != null && outstanding.createdAt!!.plus(mfa.emailCodeCooldown).isAfter(now)) {
            throw TafelApiException(HttpStatus.TOO_MANY_REQUESTS, "Bitte einen Moment warten, bevor ein neuer Code angefordert wird!")
        }

        val code = mfa.emailCodeForTests ?: newCode()
        mfaEmailCodeRepository.deleteAllByUserId(user.id!!)
        mfaEmailCodeRepository.save(MfaEmailCodeEntity(user, hash(user.id!!, code), now.plus(mfa.emailCodeValidity)))

        val context = Context().apply {
            setVariable("username", user.username)
            setVariable("code", code)
            setVariable("validityMinutes", mfa.emailCodeValidity.toMinutes())
        }
        mailSenderService.sendHtmlMailTo(
            mailType = "Bestätigungscode",
            recipients = listOf(address),
            subject = "Ihr Bestätigungscode",
            templateName = "mails/mfa-code-mail",
            context = context,
        )
        logger.info("E-mail code queued for user {}", user.username)
    }

    /** Whether [code] is the live code of [userId]; an accepted code is used up. */
    @Transactional
    fun consume(userId: Long, code: String): Boolean {
        val outstanding = mfaEmailCodeRepository.findByUserId(userId) ?: return false
        if (outstanding.expiresAt.isBefore(LocalDateTime.now(clock))) {
            mfaEmailCodeRepository.deleteAllByUserId(userId)
            return false
        }

        val matches = MessageDigest.isEqual(
            hash(userId, code.filterNot { it.isWhitespace() }).toByteArray(Charsets.US_ASCII),
            outstanding.codeHash.toByteArray(Charsets.US_ASCII),
        )
        if (matches) {
            mfaEmailCodeRepository.deleteAllByUserId(userId)
        }
        return matches
    }

    @Transactional
    fun discard(userId: Long) {
        mfaEmailCodeRepository.deleteAllByUserId(userId)
    }

    private fun newCode(): String = secureRandom.nextInt(CODE_BOUND).toString().padStart(CODE_DIGITS, '0')
}
