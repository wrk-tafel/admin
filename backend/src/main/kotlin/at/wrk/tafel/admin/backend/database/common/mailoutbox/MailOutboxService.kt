package at.wrk.tafel.admin.backend.database.common.mailoutbox

import jakarta.mail.internet.MimeMessage
import org.slf4j.LoggerFactory
import org.springframework.context.ApplicationEventPublisher
import org.springframework.data.domain.Limit
import org.springframework.mail.javamail.JavaMailSender
import org.springframework.scheduling.annotation.Scheduled
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional
import org.springframework.transaction.support.TransactionSynchronizationManager
import java.io.ByteArrayInputStream
import java.io.ByteArrayOutputStream
import java.time.Clock
import java.time.LocalDateTime
import java.util.concurrent.TimeUnit

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
 * - a failed send is retried on a backoff and, after [MAX_ATTEMPTS], parked as
 *   [MailOutboxStatus.FAILED] with the error rather than dropped, and announced with a
 *   [MailDeliveryFailedEvent] - the caller that asked for the mail is long gone by then, so nothing
 *   else would ever tell anybody it did not arrive.
 */
@Service
class MailOutboxService(
    private val mailOutboxRepository: MailOutboxRepository,
    private val mailSender: JavaMailSender?,
    private val clock: Clock,
    private val eventPublisher: ApplicationEventPublisher,
) {

    companion object {
        private val logger = LoggerFactory.getLogger(MailOutboxService::class.java)

        private const val MAX_ATTEMPTS = 5
        private const val BATCH_SIZE = 20
        private const val RETRY_BACKOFF_MINUTES = 5L
        private const val MAX_RETRY_BACKOFF_MINUTES = 30L
        private const val SENT_MAILS_CLEANUP_KEEP_DAYS = 14L
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
     */
    @Transactional
    fun enqueue(mimeMessage: MimeMessage, subject: String, recipients: List<String>) {
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
        }

        mailOutboxRepository.save(entity)
        logger.debug("Mail '{}' queued for {}", entity.subject, entity.recipients)
    }

    /**
     * Deliberately not `@Transactional` as a whole: every mail's outcome is saved on its own, so one
     * that fails cannot roll back the outcome already recorded for the others in the batch.
     */
    @Scheduled(fixedDelayString = "\${tafeladmin.mailOutbox.interval:10s}")
    fun sendPendingMails() {
        if (mailSender == null) {
            return
        }

        val pendingMails = mailOutboxRepository.findAllByStatusAndNextAttemptAtLessThanEqualOrderByIdAsc(
            status = MailOutboxStatus.PENDING,
            nextAttemptAt = LocalDateTime.now(clock),
            limit = Limit.of(BATCH_SIZE),
        )

        pendingMails.forEach { send(it, mailSender) }
    }

    @Scheduled(fixedDelay = 1, timeUnit = TimeUnit.HOURS)
    fun cleanupSentMails() {
        mailOutboxRepository.deleteAllByStatusAndSentAtBefore(
            MailOutboxStatus.SENT,
            LocalDateTime.now(clock).minusDays(SENT_MAILS_CLEANUP_KEEP_DAYS),
        )
    }

    private fun send(mail: MailOutboxEntity, mailSender: JavaMailSender) {
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

            val givenUp = mail.attempts >= MAX_ATTEMPTS
            if (givenUp) {
                mail.status = MailOutboxStatus.FAILED
                logger.error("Mail '${mail.subject}' to ${mail.recipients} given up on after ${mail.attempts} attempts", e)
            } else {
                mail.nextAttemptAt = LocalDateTime.now(clock).plusMinutes(backoffMinutes(mail.attempts))
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

    private fun backoffMinutes(attempts: Int) = minOf(attempts * RETRY_BACKOFF_MINUTES, MAX_RETRY_BACKOFF_MINUTES)
}

private fun MimeMessage.toByteArray(): ByteArray {
    val outputStream = ByteArrayOutputStream()
    writeTo(outputStream)
    return outputStream.toByteArray()
}
