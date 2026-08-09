package at.wrk.tafel.admin.backend.database.common.mailoutbox

import at.wrk.tafel.admin.backend.TafelBaseIntegrationTest
import jakarta.mail.Message
import jakarta.mail.Session
import jakarta.mail.internet.InternetAddress
import jakarta.mail.internet.MimeMessage
import org.assertj.core.api.Assertions.assertThat
import org.junit.jupiter.api.Test
import org.springframework.beans.factory.annotation.Autowired
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

    @Autowired
    private lateinit var mailOutboxService: MailOutboxService

    @Autowired
    private lateinit var mailOutboxRepository: MailOutboxRepository

    @Test
    fun `a queued mail is stored as pending and comes back byte-for-byte`() {
        val mimeMessage = MimeMessage(Session.getInstance(Properties())).apply {
            setSubject("Support-Anfrage: Login geht nicht")
            setRecipient(Message.RecipientType.TO, InternetAddress("support@localhost"))
            setText("Anliegen")
            saveChanges()
        }
        val expectedMessage = mimeMessage.toByteArray()

        mailOutboxService.enqueue(mimeMessage, "Support-Anfrage: Login geht nicht", listOf("support@localhost"))

        val storedMail = mailOutboxRepository.findAll().single { it.recipients == "support@localhost" }
        assertThat(storedMail.id).isNotNull()
        assertThat(storedMail.subject).isEqualTo("Support-Anfrage: Login geht nicht")
        assertThat(storedMail.status).isEqualTo(MailOutboxStatus.PENDING)
        assertThat(storedMail.attempts).isZero()
        assertThat(storedMail.createdAt).isNotNull()
        assertThat(storedMail.nextAttemptAt).isNotNull()
        assertThat(storedMail.sentAt).isNull()
        assertThat(storedMail.message).isEqualTo(expectedMessage)
    }

    private fun MimeMessage.toByteArray() = java.io.ByteArrayOutputStream().also { writeTo(it) }.toByteArray()
}
