package at.wrk.tafel.admin.backend.database.common.mailoutbox

import at.wrk.tafel.admin.backend.config.properties.TafelAdminMailOutboxProperties
import at.wrk.tafel.admin.backend.config.properties.TafelAdminProperties
import at.wrk.tafel.admin.backend.database.model.base.MailType
import jakarta.mail.internet.MimeMessage
import org.slf4j.LoggerFactory
import org.springframework.context.ApplicationEventPublisher
import org.springframework.mail.javamail.JavaMailSender
import org.springframework.scheduling.annotation.Scheduled
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional
import org.springframework.transaction.support.TransactionSynchronizationManager
import org.springframework.transaction.support.TransactionTemplate
import java.io.ByteArrayInputStream
import java.io.ByteArrayOutputStream
import java.time.Clock
import java.time.Duration
import java.time.LocalDateTime

/**
 * Sending side of the mail outbox: a mail is written to `mail_outbox` inside the transaction that
 * produced it and handed to the mail server afterwards, by [sendPendingMails].
 *
 * Same reason as the SSE outbox (`SseOutboxService`), for the opposite failure: an SMTP call inside
 * a business transaction couples that transaction to a server this application does not control.
 * A slow mail server made a distribution close slowly, and an unreachable one lost the daily report
 * for good - the work was committed, the mail was gone, and nothing recorded that it never left.
 * With the queue in the database, the mail survives an SMTP outage and an application restart, and
 * a rolled-back transaction takes its mail down with it instead of sending a mail about work that
 * did not happen.
 *
 * Two differences to the SSE outbox, both deliberate:
 * - it polls rather than reacting to `pg_notify`. Nothing here is latency-critical, and a poll is
 *   also what picks up a retry and a row left behind by a crash - a notification can do neither.
 * - a failed send is retried on a backoff and, after [TafelAdminMailOutboxProperties.maxAttempts],
 *   parked as [MailOutboxStatus.FAILED] with the error rather than dropped, and announced with a
 *   [MailDeliveryFailedEvent] - the caller that asked for the mail is long gone by then, so nothing
 *   else would ever tell anybody it did not arrive.
 *
 * One mail is taken, sent and recorded per transaction, and it is taken with `FOR UPDATE SKIP
 * LOCKED` - which is what lets more than one application instance poll the same queue without both
 * of them delivering the same mail.
 */
@Service
class MailOutboxService(
    private val mailOutboxRepository: MailOutboxRepository,
    private val transactionTemplate: TransactionTemplate,
    private val mailSender: JavaMailSender?,
    private val clock: Clock,
    private val eventPublisher: ApplicationEventPublisher,
    private val tafelAdminProperties: TafelAdminProperties,
) {

    companion object {
        private val logger = LoggerFactory.getLogger(MailOutboxService::class.java)
    }

    /**
     * Takes part in the caller's transaction on purpose - see the class comment: the mail is only
     * queued if the work it reports on is committed.
     *
     * That also makes queuing a mail a *write* the caller has to be able to perform. A caller whose
     * transaction is read-only is rejected here with a message that says so, rather than by Postgres
     * refusing `mail_outbox_seq`'s `nextval()` several frames deeper - the annotation on the
     * outermost transaction is what has to change, and nothing about "cannot execute nextval() in a
     * read-only transaction" points there. A read-only transaction is a plausible thing to have on a
     * method that only reads its own data and then sends a mail about it, which is exactly how
     * [at.wrk.tafel.admin.backend.modules.reporting.internal.DistributionClosedEventListener]
     * silently stopped sending anything.
     *
     * With no mail server configured - a dev machine, the test and e2e runs - nothing is queued at
     * all: there is nothing to deliver to, so a row would only pile up. This is the one place that
     * asks the question; [MailSenderService] composes regardless and does not know whether a mail
     * server exists.
     */
    @Transactional
    fun enqueue(mimeMessage: MimeMessage, subject: String, recipients: List<String>, mailType: MailType? = null) {
        if (mailSender == null) {
            logger.debug("Mail '{}' not queued - no mail server configured", subject)
            return
        }

        check(!TransactionSynchronizationManager.isCurrentTransactionReadOnly()) {
            "Cannot queue mail '$subject': the caller's transaction is read-only, and queuing a mail writes to mail_outbox. " +
                "Make the transaction that sends this mail read-write."
        }

        val entity = MailOutboxEntity().apply {
            this.createdAt = LocalDateTime.now(clock)
            this.subject = subject.take(500)
            this.recipients = recipients.joinToString(", ")
            this.message = mimeMessage.toByteArray()
            this.status = MailOutboxStatus.PENDING
            this.nextAttemptAt = LocalDateTime.now(clock)
            this.mailType = mailType
        }

        mailOutboxRepository.save(entity)
        logger.debug("Mail '{}' queued for {}", entity.subject, entity.recipients)
    }

    /**
     * Sends every mail that is due, one transaction per mail: the row is taken with `FOR UPDATE SKIP
     * LOCKED`, handed to the mail server and its outcome recorded, all under that one transaction.
     *
     * The lock is what a second application instance runs into - it skips the row and takes the next
     * one instead of waiting, so two pollers share the queue rather than both delivering it. Holding
     * it across the SMTP call is deliberate and is why the scope is one mail: a poller killed
     * mid-send rolls that single mail back to `PENDING`, where the next poll picks it up seconds
     * later, and the mails already sent keep their recorded outcome because they were committed one
     * by one.
     *
     * The cutoff is read once, so a poll delivers the mails that were due when it started rather
     * than chasing rows that became due while it ran - those are the next tick's.
     */
    @Scheduled(fixedDelayString = "\${tafeladmin.mailOutbox.interval:10s}")
    fun sendPendingMails() {
        if (mailSender == null) {
            return
        }

        // Read once so the whole poll is handled by one consistent set of settings - they are
        // re-bound in place when the config file changes (see ConfigFileReloadService), and
        // re-reading per mail could straddle a reload.
        val properties = tafelAdminProperties.mailOutbox
        val dueUntil = LocalDateTime.now(clock)
        val handledIds = mutableSetOf<Long>()

        while (true) {
            val handledId = sendNextDueMail(dueUntil, mailSender, properties) ?: return
            // A sent mail leaves the queue and a failed one is rescheduled into the future, so the
            // same row cannot come back - unless an operator configured a retryBackoff of zero, and
            // this is what keeps that from spinning the poll forever against the mail server.
            if (!handledIds.add(handledId)) {
                logger.warn("Mail {} is due again immediately - stopping this poll, check tafeladmin.mailOutbox.retryBackoff", handledId)
                return
            }
        }
    }

    private fun sendNextDueMail(
        dueUntil: LocalDateTime,
        mailSender: JavaMailSender,
        properties: TafelAdminMailOutboxProperties,
    ): Long? = transactionTemplate.execute {
        mailOutboxRepository.findNextDueForUpdateSkipLocked(MailOutboxStatus.PENDING.name, dueUntil)
            ?.let { mail ->
                send(mail, mailSender, properties)
                mail.id
            }
    }

    /**
     * Empties the queue of what it no longer has to keep - both ways a mail can end.
     *
     * A [MailOutboxStatus.FAILED] row outlives a sent one because it is the record of a mail nobody
     * received, and somebody may still come asking about it long after the incident. It does not
     * outlive it *forever*, though: the row holds the whole message, report PDF or support
     * screenshot included, so keeping it indefinitely would leave personal data in the queue that no
     * retention rule and no erasure ever reaches. Its window is counted from when the mail was
     * queued - the give-up follows within a couple of hours of that, and nothing records the exact
     * moment.
     */
    @Scheduled(fixedDelayString = "\${tafeladmin.mailOutbox.cleanupInterval:1h}")
    fun cleanupOldMails() {
        val properties = tafelAdminProperties.mailOutbox
        val now = LocalDateTime.now(clock)

        mailOutboxRepository.deleteAllByStatusAndSentAtBeforeSkipLocked(
            MailOutboxStatus.SENT.name,
            now.minus(properties.sentRetention),
        )
        mailOutboxRepository.deleteAllByStatusAndCreatedAtBeforeSkipLocked(
            MailOutboxStatus.FAILED.name,
            now.minus(properties.failedRetention),
        )
    }

    private fun send(mail: MailOutboxEntity, mailSender: JavaMailSender, properties: TafelAdminMailOutboxProperties) {
        try {
            mailSender.send(mailSender.createMimeMessage(ByteArrayInputStream(mail.message)))

            mail.status = MailOutboxStatus.SENT
            mail.sentAt = LocalDateTime.now(clock)
            mail.attempts += 1
            mail.lastError = null
            mailOutboxRepository.save(mail)

            logger.info("Mail '{}' sent to {}", mail.subject, mail.recipients)
        } catch (e: Exception) {
            mail.attempts += 1
            mail.lastError = "${e.javaClass.simpleName}: ${e.message}"

            val givenUp = mail.attempts >= properties.maxAttempts
            if (givenUp) {
                mail.status = MailOutboxStatus.FAILED
                logger.error("Mail '${mail.subject}' to ${mail.recipients} given up on after ${mail.attempts} attempts", e)
            } else {
                mail.nextAttemptAt = LocalDateTime.now(clock).plus(retryDelay(mail.attempts, properties))
                logger.warn(
                    "Mail '{}' to {} failed on attempt {}, retrying at {}: {}",
                    mail.subject,
                    mail.recipients,
                    mail.attempts,
                    mail.nextAttemptAt,
                    mail.lastError,
                )
            }

            mailOutboxRepository.save(mail)

            // Only once the row is parked, and only after it is saved: this is the one point at
            // which the failure is final, and whoever reacts to it should see FAILED, not PENDING.
            if (givenUp) {
                eventPublisher.publishEvent(
                    MailDeliveryFailedEvent(
                        // Both are always set by enqueue; the columns are nullable only because the
                        // entity mirrors the table, which allows it.
                        subject = mail.subject.orEmpty(),
                        recipients = mail.recipients.orEmpty(),
                        lastError = mail.lastError,
                    ),
                )
            }
        }
    }

    private fun retryDelay(attempts: Int, properties: TafelAdminMailOutboxProperties): Duration = minOf(properties.retryBackoff.multipliedBy(attempts.toLong()), properties.maxRetryBackoff)
}

private fun MimeMessage.toByteArray(): ByteArray {
    val outputStream = ByteArrayOutputStream()
    writeTo(outputStream)
    return outputStream.toByteArray()
}
