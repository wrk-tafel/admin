package at.wrk.tafel.admin.backend.database.common.mailoutbox

import at.wrk.tafel.admin.backend.config.properties.TafelAdminMailOutboxProperties
import at.wrk.tafel.admin.backend.config.properties.TafelAdminProperties
import at.wrk.tafel.admin.backend.database.model.base.MailType
import io.mockk.every
import io.mockk.impl.annotations.RelaxedMockK
import io.mockk.junit5.MockKExtension
import io.mockk.slot
import io.mockk.verify
import jakarta.mail.Session
import jakarta.mail.internet.InternetAddress
import jakarta.mail.internet.MimeMessage
import org.assertj.core.api.Assertions.assertThat
import org.assertj.core.api.Assertions.assertThatThrownBy
import org.junit.jupiter.api.BeforeEach
import org.junit.jupiter.api.Test
import org.junit.jupiter.api.extension.ExtendWith
import org.springframework.context.ApplicationEventPublisher
import org.springframework.mail.MailSendException
import org.springframework.mail.javamail.JavaMailSender
import org.springframework.transaction.PlatformTransactionManager
import org.springframework.transaction.TransactionDefinition
import org.springframework.transaction.TransactionStatus
import org.springframework.transaction.support.SimpleTransactionStatus
import org.springframework.transaction.support.TransactionSynchronizationManager
import org.springframework.transaction.support.TransactionTemplate
import java.io.ByteArrayInputStream
import java.time.Clock
import java.time.Duration
import java.time.Instant
import java.time.LocalDateTime
import java.time.ZoneId
import java.util.Properties

@ExtendWith(MockKExtension::class)
class MailOutboxServiceTest {

    @RelaxedMockK
    private lateinit var mailOutboxRepository: MailOutboxRepository

    @RelaxedMockK
    private lateinit var mailSender: JavaMailSender

    @RelaxedMockK
    private lateinit var eventPublisher: ApplicationEventPublisher

    /**
     * The poller's transaction boundary, real rather than mocked - [TransactionTemplate] is what
     * runs the callback, and a mock of it would only be a mock of the code under test. What it
     * commits to is a no-op: this class asserts what the send does, not what Postgres does with it.
     */
    private val transactionTemplate = TransactionTemplate(
        object : PlatformTransactionManager {
            override fun getTransaction(definition: TransactionDefinition?): TransactionStatus = SimpleTransactionStatus()

            override fun commit(status: TransactionStatus) = Unit

            override fun rollback(status: TransactionStatus) = Unit
        },
    )

    private var nextId = 1L

    private val now = LocalDateTime.of(2026, 3, 22, 10, 15, 30)
    private val clock = Clock.fixed(Instant.parse("2026-03-22T09:15:30Z"), ZoneId.of("Europe/Vienna"))

    @BeforeEach
    fun beforeEach() {
        // a relaxed mock would hand back a bare Object for the generic save()
        every { mailOutboxRepository.save(any<MailOutboxEntity>()) } answers { firstArg() }
    }

    @Test
    fun `enqueue stores the composed message, its subject and its recipients as pending`() {
        val service = service()

        service.enqueue(mimeMessage("subject"), "subject", listOf("to1@localhost", "to2@localhost"))

        val entitySlot = slot<MailOutboxEntity>()
        verify { mailOutboxRepository.save(capture(entitySlot)) }

        val entity = entitySlot.captured
        assertThat(entity.subject).isEqualTo("subject")
        assertThat(entity.recipients).isEqualTo("to1@localhost, to2@localhost")
        assertThat(entity.status).isEqualTo(MailOutboxStatus.PENDING)
        assertThat(entity.attempts).isZero()
        assertThat(entity.createdAt).isEqualTo(now)
        // due immediately - the poller decides when it actually goes out
        assertThat(entity.nextAttemptAt).isEqualTo(now)
        assertThat(String(entity.message!!)).contains("Subject: subject")
        // no mail type given - the queue does not invent one, and nothing reports on this mail
        assertThat(entity.mailType).isNull()
    }

    @Test
    fun `enqueue records the mail type it was given`() {
        val service = service()

        service.enqueue(mimeMessage("subject"), "subject", listOf("to@localhost"), MailType.DAILY_REPORT)

        val entitySlot = slot<MailOutboxEntity>()
        verify { mailOutboxRepository.save(capture(entitySlot)) }

        assertThat(entitySlot.captured.mailType).isEqualTo(MailType.DAILY_REPORT)
    }

    @Test
    fun `sending marks a mail as sent`() {
        val service = service()
        val dueMail = dueMail()
        givenDueMails(dueMail)
        every { mailSender.createMimeMessage(any<ByteArrayInputStream>()) } returns mimeMessage("subject")

        service.sendPendingMails()

        verify { mailSender.send(any<MimeMessage>()) }
        assertThat(dueMail.status).isEqualTo(MailOutboxStatus.SENT)
        assertThat(dueMail.sentAt).isEqualTo(now)
        assertThat(dueMail.attempts).isEqualTo(1)
        assertThat(dueMail.lastError).isNull()
        verify { mailOutboxRepository.save(dueMail) }
    }

    @Test
    fun `a failed send is retried later with the error recorded`() {
        val service = service()
        val dueMail = dueMail()
        givenDueMails(dueMail)
        every { mailSender.createMimeMessage(any<ByteArrayInputStream>()) } returns mimeMessage("subject")
        every { mailSender.send(any<MimeMessage>()) } throws MailSendException("smtp is down")

        service.sendPendingMails()

        assertThat(dueMail.status).isEqualTo(MailOutboxStatus.PENDING)
        assertThat(dueMail.attempts).isEqualTo(1)
        assertThat(dueMail.lastError).contains("smtp is down")
        assertThat(dueMail.nextAttemptAt).isEqualTo(now.plusMinutes(5))
        verify { mailOutboxRepository.save(dueMail) }
    }

    @Test
    fun `a mail is given up on after the last attempt and kept with its error`() {
        val service = service()
        val dueMail = dueMail().apply { attempts = 4 }
        givenDueMails(dueMail)
        every { mailSender.createMimeMessage(any<ByteArrayInputStream>()) } returns mimeMessage("subject")
        every { mailSender.send(any<MimeMessage>()) } throws MailSendException("smtp is down")

        service.sendPendingMails()

        assertThat(dueMail.status).isEqualTo(MailOutboxStatus.FAILED)
        assertThat(dueMail.attempts).isEqualTo(5)
        assertThat(dueMail.lastError).contains("smtp is down")
        verify { mailOutboxRepository.save(dueMail) }
    }

    @Test
    fun `giving up on a mail announces it, so the failure is not just a row nobody reads`() {
        val service = service()
        val dueMail = dueMail().apply { attempts = 4 }
        givenDueMails(dueMail)
        every { mailSender.createMimeMessage(any<ByteArrayInputStream>()) } returns mimeMessage("subject")
        every { mailSender.send(any<MimeMessage>()) } throws MailSendException("smtp is down")

        service.sendPendingMails()

        val eventSlot = slot<MailDeliveryFailedEvent>()
        verify { eventPublisher.publishEvent(capture(eventSlot)) }
        assertThat(eventSlot.captured.subject).isEqualTo("subject")
        assertThat(eventSlot.captured.recipients).isEqualTo("to@localhost")
        assertThat(eventSlot.captured.lastError).contains("smtp is down")
    }

    @Test
    fun `a mail that will be retried announces nothing yet`() {
        val service = service()
        givenDueMails(dueMail())
        every { mailSender.createMimeMessage(any<ByteArrayInputStream>()) } returns mimeMessage("subject")
        every { mailSender.send(any<MimeMessage>()) } throws MailSendException("smtp is down")

        service.sendPendingMails()

        verify(exactly = 0) { eventPublisher.publishEvent(any<MailDeliveryFailedEvent>()) }
    }

    /**
     * Queuing a mail is a write, so a read-only caller cannot do it. It is rejected here with a
     * message naming the cause, rather than several frames deeper by Postgres refusing
     * `mail_outbox_seq`'s `nextval()` - which is what made this fail silently the first time.
     */
    @Test
    fun `enqueue refuses a read-only transaction and says why`() {
        val service = service()
        TransactionSynchronizationManager.setActualTransactionActive(true)
        TransactionSynchronizationManager.setCurrentTransactionReadOnly(true)

        try {
            assertThatThrownBy { service.enqueue(mimeMessage("subject"), "subject", listOf("to@localhost")) }
                .isInstanceOf(IllegalStateException::class.java)
                .hasMessageContaining("read-only")

            verify(exactly = 0) { mailOutboxRepository.save(any<MailOutboxEntity>()) }
        } finally {
            TransactionSynchronizationManager.setCurrentTransactionReadOnly(false)
            TransactionSynchronizationManager.setActualTransactionActive(false)
        }
    }

    @Test
    fun `one failing mail does not stop the rest of the batch`() {
        val service = service()
        val failing = dueMail()
        val succeeding = dueMail()
        givenDueMails(failing, succeeding)
        every { mailSender.createMimeMessage(any<ByteArrayInputStream>()) } returns mimeMessage("subject")
        every { mailSender.send(any<MimeMessage>()) } throws MailSendException("smtp is down") andThen Unit

        service.sendPendingMails()

        assertThat(failing.status).isEqualTo(MailOutboxStatus.PENDING)
        assertThat(succeeding.status).isEqualTo(MailOutboxStatus.SENT)
    }

    /**
     * With nothing to deliver to, a queued mail would only pile up - so it is not queued at all.
     * This is the one place that asks whether a mail server exists; `MailSenderService` composes
     * either way.
     */
    @Test
    fun `nothing is queued when no mail server is configured`() {
        val service = service(mailSender = null)

        service.enqueue(mimeMessage("subject"), "subject", listOf("to@localhost"))

        verify(exactly = 0) { mailOutboxRepository.save(any<MailOutboxEntity>()) }
    }

    @Test
    fun `nothing is polled when no mail server is configured`() {
        val service = service(mailSender = null)

        service.sendPendingMails()

        verify(exactly = 0) { mailOutboxRepository.findNextDueForUpdateSkipLocked(any(), any()) }
    }

    /**
     * The tuning is configuration, not constants - an operator raising the backoff during a mail
     * server incident has to actually take effect.
     */
    @Test
    fun `configured attempt limit and backoff are what is applied`() {
        val service = service(
            properties = TafelAdminMailOutboxProperties().apply {
                maxAttempts = 2
                retryBackoff = Duration.ofSeconds(30)
                maxRetryBackoff = Duration.ofMinutes(2)
            },
        )
        val firstFailure = dueMail()
        val lastAttempt = dueMail().apply { attempts = 1 }
        givenDueMails(firstFailure, lastAttempt)
        every { mailSender.createMimeMessage(any<ByteArrayInputStream>()) } returns mimeMessage("subject")
        every { mailSender.send(any<MimeMessage>()) } throws MailSendException("smtp is down")

        service.sendPendingMails()

        assertThat(firstFailure.status).isEqualTo(MailOutboxStatus.PENDING)
        assertThat(firstFailure.nextAttemptAt).isEqualTo(now.plusSeconds(30))
        // second attempt of two - given up on, where the default of five would still be retrying
        assertThat(lastAttempt.status).isEqualTo(MailOutboxStatus.FAILED)
    }

    @Test
    fun `the growing backoff is capped`() {
        val service = service(
            properties = TafelAdminMailOutboxProperties().apply {
                maxAttempts = 10
                retryBackoff = Duration.ofMinutes(5)
                maxRetryBackoff = Duration.ofMinutes(12)
            },
        )
        val mail = dueMail().apply { attempts = 5 }
        givenDueMails(mail)
        every { mailSender.createMimeMessage(any<ByteArrayInputStream>()) } returns mimeMessage("subject")
        every { mailSender.send(any<MimeMessage>()) } throws MailSendException("smtp is down")

        service.sendPendingMails()

        // 6 x 5min would be 30, the cap is 12
        assertThat(mail.nextAttemptAt).isEqualTo(now.plusMinutes(12))
    }

    @Test
    fun `a poll with nothing due sends nothing`() {
        val service = service()
        givenDueMails()

        service.sendPendingMails()

        verify(exactly = 0) { mailSender.send(any<MimeMessage>()) }
    }

    /**
     * The poll keeps taking the next due mail until there is none - the queue is drained per poll,
     * not capped at a batch. Each one is taken with its own locking read, which is what a second
     * instance's poller runs into.
     */
    @Test
    fun `a poll works through every due mail, one at a time`() {
        val service = service()
        val mails = listOf(dueMail(), dueMail(), dueMail())
        givenDueMails(*mails.toTypedArray())
        every { mailSender.createMimeMessage(any<ByteArrayInputStream>()) } returns mimeMessage("subject")

        service.sendPendingMails()

        verify(exactly = 3) { mailSender.send(any<MimeMessage>()) }
        assertThat(mails).allMatch { it.status == MailOutboxStatus.SENT }
        // four reads for three mails: the last one is what ends the poll
        verify(exactly = 4) { mailOutboxRepository.findNextDueForUpdateSkipLocked(MailOutboxStatus.PENDING.name, now) }
    }

    /**
     * A mail is due again immediately only if the backoff was configured to zero, and a poll that
     * keeps taking the same row would hammer the mail server for as long as the application runs.
     */
    @Test
    fun `a mail that comes back due immediately does not spin the poll`() {
        val service = service(properties = TafelAdminMailOutboxProperties().apply { retryBackoff = Duration.ZERO })
        val mail = dueMail()
        every { mailOutboxRepository.findNextDueForUpdateSkipLocked(any(), any()) } returns mail
        every { mailSender.createMimeMessage(any<ByteArrayInputStream>()) } returns mimeMessage("subject")
        every { mailSender.send(any<MimeMessage>()) } throws MailSendException("smtp is down")

        service.sendPendingMails()

        verify(exactly = 2) { mailOutboxRepository.findNextDueForUpdateSkipLocked(any(), any()) }
    }

    @Test
    fun `cleanup removes sent mails older than the retention window`() {
        val service = service()

        service.cleanupOldMails()

        verify {
            mailOutboxRepository.deleteAllByStatusAndSentAtBeforeSkipLocked(MailOutboxStatus.SENT.name, now.minusDays(14))
        }
    }

    /**
     * A mail nobody received is kept longer than a sent one, and counted from when it was queued -
     * it has no `sentAt`. But it is not kept forever: the row holds the whole message, attachments
     * and all, and that copy is reached by no other retention rule (see the GDPR analysis, G10).
     */
    @Test
    fun `cleanup removes mails that were given up on after their own longer window`() {
        val service = service()

        service.cleanupOldMails()

        verify {
            mailOutboxRepository.deleteAllByStatusAndCreatedAtBeforeSkipLocked(MailOutboxStatus.FAILED.name, now.minusDays(30))
        }
    }

    @Test
    fun `the configured retention windows are what the cleanup applies`() {
        val service = service(
            properties = TafelAdminMailOutboxProperties().apply {
                sentRetention = Duration.ofDays(3)
                failedRetention = Duration.ofDays(7)
            },
        )

        service.cleanupOldMails()

        verify {
            mailOutboxRepository.deleteAllByStatusAndSentAtBeforeSkipLocked(MailOutboxStatus.SENT.name, now.minusDays(3))
            mailOutboxRepository.deleteAllByStatusAndCreatedAtBeforeSkipLocked(MailOutboxStatus.FAILED.name, now.minusDays(7))
        }
    }

    private fun service(
        mailSender: JavaMailSender? = this.mailSender,
        properties: TafelAdminMailOutboxProperties = TafelAdminMailOutboxProperties(),
    ) = MailOutboxService(
        mailOutboxRepository,
        transactionTemplate,
        mailSender,
        clock,
        eventPublisher,
        TafelAdminProperties().apply { mailOutbox = properties },
    )

    /**
     * Ids matter here: the poll uses them to notice a mail that keeps coming back due, and
     * [at.wrk.tafel.admin.backend.database.model.base.BaseEntity] compares by id, so two rows
     * without one would be the same row to every assertion.
     */
    private fun dueMail() = MailOutboxEntity().apply {
        id = nextId++
        createdAt = now
        subject = "subject"
        recipients = "to@localhost"
        message = "raw message".toByteArray()
        status = MailOutboxStatus.PENDING
        nextAttemptAt = now
    }

    /** What the poller reads, one row per call, until it comes up empty and the poll ends. */
    private fun givenDueMails(vararg mails: MailOutboxEntity) {
        every {
            mailOutboxRepository.findNextDueForUpdateSkipLocked(any(), any())
        } returnsMany (mails.toList() + null)
    }

    private fun mimeMessage(subject: String) = MimeMessage(Session.getInstance(Properties())).apply {
        setSubject(subject)
        setRecipient(jakarta.mail.Message.RecipientType.TO, InternetAddress("to@localhost"))
        setText("text")
        saveChanges()
    }
}
