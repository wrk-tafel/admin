package at.wrk.tafel.admin.backend.common.auth.components

import at.wrk.tafel.admin.backend.common.mail.MailSenderService
import org.springframework.stereotype.Service
import org.thymeleaf.context.Context

/**
 * Tells a user by mail that something security-relevant changed on their account - the address a code is
 * sent to, a second-factor method switched on or off, an administrator's reset. The change is on the audit
 * trail, but nothing there reaches the person it happened to; this is what lets them notice a session that
 * was not theirs.
 *
 * Only composes and queues the mail (see `MailSenderService`), so it joins the caller's transaction: a change
 * that rolls back sends nothing. Where no mail is configured, or the account has no address, it does nothing.
 */
@Service
class AccountSecurityNotificationService(
    private val mailSenderService: MailSenderService,
) {

    fun notify(username: String, address: String?, message: String) {
        if (address.isNullOrBlank()) {
            return
        }

        val context = Context().apply {
            setVariable("username", username)
            setVariable("message", message)
        }
        mailSenderService.sendHtmlMailTo(
            mailType = "Sicherheitshinweis",
            recipients = listOf(address),
            subject = "Sicherheitshinweis zu Ihrem Konto",
            templateName = "mails/account-security-mail",
            context = context,
        )
    }
}
