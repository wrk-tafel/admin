package at.wrk.tafel.admin.backend.common.auth.components

import at.wrk.tafel.admin.backend.common.mail.MailSenderService
import at.wrk.tafel.admin.backend.config.properties.TafelAdminProperties
import at.wrk.tafel.admin.backend.database.model.auth.PasswordResetTokenEntity
import at.wrk.tafel.admin.backend.database.model.auth.PasswordResetTokenRepository
import at.wrk.tafel.admin.backend.database.model.auth.UserEntity
import at.wrk.tafel.admin.backend.database.model.auth.UserRepository
import org.slf4j.LoggerFactory
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional
import org.thymeleaf.context.Context
import java.time.Clock
import java.time.LocalDateTime

/**
 * "Passwort vergessen?" (issue #3840, ADR-0072): a user who has an e-mail address on the account asks
 * for a link by username or address, and sets a new password with it on a page reachable without a
 * session.
 *
 * - **The answer to a request never says whether an account was found.** An unknown identifier, an
 *   account without an address, a disabled account and one still inside the cooldown all get the
 *   same response as a real request ([request] returns nothing).
 * - **The token is single-use, short-lived and only stored as a hash** ([SingleUseToken]); a new
 *   request replaces the earlier link.
 * - **The link carries the token in the URL fragment** (`#token=...`), which browsers never send to a
 *   server, so it does not end up in `access.log`. It is built from `tafeladmin.server.publicUrl`,
 *   never from the request.
 * - **Setting the password does not skip the second factor**, and does not touch the login lockout:
 *   it ends every session ([TafelUserDetailsManager.resetPassword]) and the next login works exactly as
 *   any other.
 */
@Service
class PasswordResetService(
    private val userRepository: UserRepository,
    private val passwordResetTokenRepository: PasswordResetTokenRepository,
    private val userDetailsManager: TafelUserDetailsManager,
    private val mailSenderService: MailSenderService,
    private val notificationService: AccountSecurityNotificationService,
    private val tafelAdminProperties: TafelAdminProperties,
    private val clock: Clock,
) {

    companion object {
        private val logger = LoggerFactory.getLogger(PasswordResetService::class.java)
        const val RESET_PATH = "passwort-zuruecksetzen"
        const val INVALID_LINK_MESSAGE = "Dieser Link ist ungültig oder abgelaufen. Bitte fordern Sie einen neuen an."
    }

    /** Whether the feature is offered at all: it needs a mail to send and an address to link to. */
    fun isAvailable(): Boolean = tafelAdminProperties.mail != null && tafelAdminProperties.server.publicBaseUrl != null

    /**
     * Mails a link to every enabled account [identifier] names - by username, or by e-mail address,
     * which is not unique across accounts. Says nothing about whether one was found.
     */
    @Transactional
    fun request(identifier: String) {
        val publicBaseUrl = tafelAdminProperties.server.publicBaseUrl
        if (tafelAdminProperties.mail == null || publicBaseUrl == null) {
            return
        }
        val trimmed = identifier.trim()
        if (trimmed.isEmpty()) {
            return
        }

        val candidates = (listOfNotNull(userRepository.findByUsername(trimmed)) + userRepository.findAllByEmailIgnoreCase(trimmed))
            .distinctBy { it.id }
            .filter { it.enabled && !it.email.isNullOrBlank() }
        if (candidates.isEmpty()) {
            logger.info("Password reset requested for an identifier that matches no account with an address")
            return
        }
        candidates.forEach { sendLink(it, publicBaseUrl) }
    }

    private fun sendLink(user: UserEntity, publicBaseUrl: String) {
        val now = LocalDateTime.now(clock)
        val config = tafelAdminProperties.passwordReset
        val latest = passwordResetTokenRepository.findFirstByUserIdOrderByCreatedAtDesc(user.id!!)
        if (latest?.createdAt != null && latest.createdAt!!.plus(config.requestCooldown).isAfter(now)) {
            logger.info("Password reset for user {} requested again within the cooldown - not sent", user.username)
            return
        }

        val token = SingleUseToken.generate()
        passwordResetTokenRepository.deleteAllByUserId(user.id!!)
        passwordResetTokenRepository.save(PasswordResetTokenEntity(user, SingleUseToken.hash(token), now.plus(config.tokenValidity)))

        val context = Context().apply {
            setVariable("username", user.username)
            setVariable("link", "$publicBaseUrl/$RESET_PATH#token=$token")
            setVariable("validityMinutes", config.tokenValidity.toMinutes())
        }
        mailSenderService.sendHtmlMailTo(
            mailType = "Passwort zurücksetzen",
            recipients = listOf(user.email!!),
            subject = "Passwort zurücksetzen",
            templateName = "mails/password-reset-mail",
            context = context,
        )
        logger.info("Password reset link queued for user {}", user.username)
    }

    /**
     * Sets [newPassword] for the account [token] was issued for. An unknown, expired or used token and
     * a disabled account are all the same [InvalidResetLinkException]; a password the policy refuses
     * is a [PasswordChangeException] and leaves the link usable for another try.
     */
    @Transactional
    fun confirm(token: String, newPassword: String) {
        val now = LocalDateTime.now(clock)
        val stored = passwordResetTokenRepository.findByTokenHash(SingleUseToken.hash(token))
            ?: throw InvalidResetLinkException()
        val user = stored.user
        if (stored.usedAt != null || stored.expiresAt.isBefore(now) || !user.enabled) {
            throw InvalidResetLinkException()
        }

        userDetailsManager.resetPassword(user, newPassword)
        stored.usedAt = now
        passwordResetTokenRepository.save(stored)

        notificationService.notify(
            user.username,
            user.email,
            "Das Passwort Ihres Kontos wurde über \"Passwort vergessen?\" neu gesetzt. Alle bestehenden Anmeldungen wurden beendet.",
        )
        logger.info("Password of user {} reset through a mailed link", user.username)
    }
}

class InvalidResetLinkException : RuntimeException(PasswordResetService.INVALID_LINK_MESSAGE)
