package at.wrk.tafel.admin.backend.common.auth.components

import at.wrk.tafel.admin.backend.common.mail.MailSenderService
import at.wrk.tafel.admin.backend.config.properties.TafelAdminProperties
import at.wrk.tafel.admin.backend.database.model.auth.EmailChangeTokenEntity
import at.wrk.tafel.admin.backend.database.model.auth.EmailChangeTokenRepository
import at.wrk.tafel.admin.backend.database.model.auth.UserRepository
import org.slf4j.LoggerFactory
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional
import org.thymeleaf.context.Context
import java.time.Clock
import java.time.LocalDateTime

/**
 * A user changing their own e-mail address (issue #3840, ADR-0072): the address is where the e-mailed
 * second factor and "Passwort vergessen?" links go, so a session left open in a browser must not be
 * able to redirect it. The change is therefore only a request until a single-use link mailed to the
 * address the account has *now* is confirmed.
 *
 * - **Only a change from one address to another is confirmed this way.** Adding a first address and
 *   removing the address take effect at once, as before: the first has no old address to confirm
 *   through (and the mandatory-second-factor setup needs it immediately), the second redirects
 *   nothing. Both still notify the old address where there is one.
 * - **Only where links can be mailed** ([isAvailable]: a mail can be sent and
 *   `tafeladmin.server.publicUrl` is set) - otherwise the change takes effect at once, as before.
 * - **The token is handled like a password reset token** ([SingleUseToken]: 256 bits, hashed,
 *   single-use, in the URL fragment). It expires with `tafeladmin.passwordReset.tokenValidity`.
 * - **A link only works for the address it was sent to.** If the address changed in the meantime (an
 *   administrator, another confirmed change), or the account was disabled, the link is invalid - the
 *   same answer as an unknown or expired one.
 */
@Service
class EmailChangeService(
    private val emailChangeTokenRepository: EmailChangeTokenRepository,
    private val userRepository: UserRepository,
    private val mailSenderService: MailSenderService,
    private val notificationService: AccountSecurityNotificationService,
    private val tafelAdminProperties: TafelAdminProperties,
    private val clock: Clock,
) {

    companion object {
        private val logger = LoggerFactory.getLogger(EmailChangeService::class.java)
        const val CONFIRM_PATH = "e-mail-bestaetigen"
        const val INVALID_LINK_MESSAGE = "Dieser Link ist ungültig oder abgelaufen. Bitte ändern Sie die E-Mail-Adresse erneut."
    }

    fun isAvailable(): Boolean = tafelAdminProperties.mail != null && tafelAdminProperties.server.publicBaseUrl != null

    /** Whether changing [oldEmail] to [newEmail] has to be confirmed through the old address. */
    fun needsConfirmation(oldEmail: String?, newEmail: String?): Boolean = isAvailable() && !oldEmail.isNullOrBlank() && !newEmail.isNullOrBlank() && !oldEmail.equals(newEmail, ignoreCase = true)

    /** The address waiting for confirmation, if any - an expired request counts as none. */
    @Transactional(readOnly = true)
    fun pendingEmail(userId: Long?): String? = userId?.let { emailChangeTokenRepository.findByUserId(it) }
        ?.takeIf { it.expiresAt.isAfter(LocalDateTime.now(clock)) }
        ?.newEmail

    /** Withdraws a pending change - when the user saves their current address again, for one. */
    @Transactional
    fun cancel(userId: Long) {
        emailChangeTokenRepository.deleteAllByUserId(userId)
    }

    /** Mails a link to the user's current address that, once confirmed, sets [newEmail]. Replaces an earlier request. */
    @Transactional
    fun request(userId: Long, newEmail: String) {
        val user = userRepository.findById(userId).orElseThrow()
        val oldEmail = user.email
        val publicBaseUrl = tafelAdminProperties.server.publicBaseUrl
        check(needsConfirmation(oldEmail, newEmail) && publicBaseUrl != null) { "No confirmation possible for this change" }

        val now = LocalDateTime.now(clock)
        val validity = tafelAdminProperties.passwordReset.tokenValidity
        val token = SingleUseToken.generate()
        emailChangeTokenRepository.deleteAllByUserId(user.id!!)
        emailChangeTokenRepository.flush()
        emailChangeTokenRepository.save(
            EmailChangeTokenEntity(user, oldEmail!!, newEmail, SingleUseToken.hash(token), now.plus(validity)),
        )

        val context = Context().apply {
            setVariable("username", user.username)
            setVariable("newEmail", newEmail)
            setVariable("link", "$publicBaseUrl/$CONFIRM_PATH#token=$token")
            setVariable("validityMinutes", validity.toMinutes())
        }
        mailSenderService.sendHtmlMailTo(
            mailType = "E-Mail-Adresse bestätigen",
            recipients = listOf(oldEmail),
            subject = "Neue E-Mail-Adresse bestätigen",
            templateName = "mails/email-change-mail",
            context = context,
        )
        logger.info("E-mail change of user {} requested, confirmation link queued", user.username)
    }

    /**
     * Applies the change [token] stands for. An unknown or expired token, a disabled account and an
     * account whose address is no longer the one the link went to are all [InvalidEmailChangeLinkException].
     */
    @Transactional
    fun confirm(token: String) {
        val stored = emailChangeTokenRepository.findByTokenHash(SingleUseToken.hash(token))
            ?: throw InvalidEmailChangeLinkException()
        val user = stored.user
        if (stored.expiresAt.isBefore(LocalDateTime.now(clock)) || !user.enabled || !stored.oldEmail.equals(user.email, ignoreCase = true)) {
            throw InvalidEmailChangeLinkException()
        }

        user.email = stored.newEmail
        userRepository.save(user)
        emailChangeTokenRepository.delete(stored)

        notificationService.notify(user.username, stored.oldEmail, "Die E-Mail-Adresse Ihres Kontos wurde auf ${stored.newEmail} geändert.")
        logger.info("E-mail change of user {} confirmed", user.username)
    }
}

class InvalidEmailChangeLinkException : RuntimeException(EmailChangeService.INVALID_LINK_MESSAGE)
