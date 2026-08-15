package at.wrk.tafel.admin.backend.database.common.mailoutbox

import at.wrk.tafel.admin.backend.TafelBaseIntegrationTest
import jakarta.mail.Message
import jakarta.mail.Session
import jakarta.mail.internet.InternetAddress
import jakarta.mail.internet.MimeMessage
import org.assertj.core.api.Assertions.assertThat
import org.junit.jupiter.api.AfterEach
import org.junit.jupiter.api.Test
import org.springframework.beans.factory.annotation.Autowired
import org.springframework.test.context.DynamicPropertyRegistry
import org.springframework.test.context.DynamicPropertySource
import java.time.LocalDateTime
import java.util.Properties

/**
 * The `mail_outbox` table and its `mail_outbox_seq` against a real database: Hibernate's
 * `id.db_structure_naming_strategy` is "standard" here (see R__00070_migrate_id_sequences.sql), so a
 * missing sequence only shows up as "relation mail_outbox_seq does not exist" at runtime - never in
 * a unit test with a mocked repository.
 *
 * It also covers the round trip that the whole outbox rests on: the composed MIME message has to
 * come back out of the `bytea` column byte-for-byte, or the mail that eventually goes out is not the
 * one that was written.
 */
class MailOutboxServiceIT : TafelBaseIntegrationTest() {

    companion object {
        @DynamicPropertySource
        @JvmStatic
        fun dynamicMailProperties(registry: DynamicPropertyRegistry) {
            // A mail server has to exist for anything to be queued at all - with none configured,
            // enqueue skips the row rather than piling up mail nobody can send. Nothing here ever
            // connects to it: this covers the queuing half only.
            registry.add("spring.mail.host") { "localhost" }
            // ...which is also why the poller must not run during this test. It would fail against
            // that address and could move the row this test is asserting on out of PENDING.
            registry.add("tafeladmin.mailOutbox.interval") { "1h" }
        }
    }

    @Autowired
    private lateinit var mailOutboxService: MailOutboxService

    @Autowired
    private lateinit var mailOutboxRepository: MailOutboxRepository

    /**
     * The queue is one table shared by every IT class, and a row left PENDING here is one another
     * class's poller will happily deliver to *its* mail server and count as its own (see
     * `DistributionSendMailsIT`). Nothing sends it from within this class, so it has to go.
     *
     * Set-based rather than row by row: every context's retention cleanup runs against this table
     * too, so a row loaded here can be gone by the time the deletes are flushed - which rolls this
     * transaction back instead of emptying the queue.
     */
    @AfterEach
    fun afterEach() {
        mailOutboxRepository.deleteAllInBatch()
    }

    @Test
    fun `a queued mail is stored as pending and comes back byte-for-byte`() {
        val mimeMessage = MimeMessage(Session.getInstance(Properties())).apply {
            setSubject("Support: Login geht nicht")
            setRecipient(Message.RecipientType.TO, InternetAddress("support@localhost"))
            setText("Anliegen")
            saveChanges()
        }
        val expectedMessage = mimeMessage.toByteArray()

        mailOutboxService.enqueue(mimeMessage, "Support: Login geht nicht", listOf("support@localhost"))

        val storedMail = mailOutboxRepository.findAll().single { it.recipients == "support@localhost" }
        assertThat(storedMail.id).isNotNull()
        assertThat(storedMail.subject).isEqualTo("Support: Login geht nicht")
        assertThat(storedMail.status).isEqualTo(MailOutboxStatus.PENDING)
        assertThat(storedMail.attempts).isZero()
        assertThat(storedMail.createdAt).isNotNull()
        assertThat(storedMail.nextAttemptAt).isNotNull()
        assertThat(storedMail.sentAt).isNull()
        assertThat(storedMail.message).isEqualTo(expectedMessage)
    }

    /**
     * The one retention rule counted from `createdAt` rather than `sentAt`, because a mail nobody
     * received has no `sentAt` at all - which a mocked repository cannot show, since it is Spring
     * Data that derives the query from that method name.
     */
    @Test
    fun `a mail given up on is deleted once its window has passed, and kept until then`() {
        val expiredMail = mailOutboxRepository.save(failedMail(createdAt = LocalDateTime.now().minusDays(31)))
        val recentMail = mailOutboxRepository.save(failedMail(createdAt = LocalDateTime.now().minusDays(29)))

        mailOutboxService.cleanupOldMails()

        assertThat(mailOutboxRepository.findById(expiredMail.id!!)).isEmpty()
        assertThat(mailOutboxRepository.findById(recentMail.id!!)).isPresent()
    }

    private fun failedMail(createdAt: LocalDateTime) = MailOutboxEntity().apply {
        this.createdAt = createdAt
        this.subject = "Tagesreport"
        this.recipients = "report@localhost"
        this.message = "raw message".toByteArray()
        this.status = MailOutboxStatus.FAILED
        this.attempts = 5
        this.lastError = "MailSendException: smtp is down"
        this.nextAttemptAt = createdAt
    }

    private fun MimeMessage.toByteArray() = java.io.ByteArrayOutputStream().also { writeTo(it) }.toByteArray()
}
