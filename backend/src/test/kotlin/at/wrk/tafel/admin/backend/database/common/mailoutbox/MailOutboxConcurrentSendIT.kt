package at.wrk.tafel.admin.backend.database.common.mailoutbox

import at.wrk.tafel.admin.backend.TafelBaseIntegrationTest
import jakarta.mail.internet.MimeMessage
import org.assertj.core.api.Assertions.assertThat
import org.junit.jupiter.api.AfterEach
import org.junit.jupiter.api.BeforeEach
import org.junit.jupiter.api.Test
import org.springframework.beans.factory.annotation.Autowired
import org.springframework.boot.test.context.TestConfiguration
import org.springframework.context.annotation.Bean
import org.springframework.context.annotation.Primary
import org.springframework.mail.javamail.JavaMailSenderImpl
import java.io.ByteArrayOutputStream
import java.time.Clock
import java.time.Duration
import java.time.LocalDateTime
import java.util.concurrent.ConcurrentLinkedQueue
import java.util.concurrent.CyclicBarrier
import java.util.concurrent.Executors
import java.util.concurrent.TimeUnit

/**
 * Two pollers against one `mail_outbox`, on a real database: what `FOR UPDATE SKIP LOCKED` is there
 * for. Without it both read the same due rows and every mail goes out twice - the reason a second
 * application instance could not be started before.
 *
 * A second instance is simulated by a second thread, since two pollers are two transactions on two
 * connections either way, which is all Postgres can tell apart. The mail server is a stub that
 * records what it was handed and takes its time doing it, so the two polls genuinely overlap instead
 * of one draining the queue before the other has read anything.
 *
 * `mail_outbox` is one table shared by every IT class, and the contexts of classes that ran before
 * this one keep their pollers running against it (see `DistributionSendMailsIT`). So the fixtures
 * here are dated an hour ahead and this context's clock is shifted two hours forward: due for the
 * polls under test, not yet due for anybody else's. For the same reason the queue is emptied with a
 * single set-based statement and the rows are asserted by id: every context's retention cleanup runs
 * against this table as well, so a row can disappear between a `findAll()` and the flush of the
 * per-row deletes it fed - which rolls the emptying transaction back.
 */
class MailOutboxConcurrentSendIT : TafelBaseIntegrationTest() {

    private companion object {
        val CLOCK_OFFSET: Duration = Duration.ofHours(2)
        val FIXTURE_DUE_IN: Duration = Duration.ofHours(1)
        const val MAIL_COUNT = 6
    }

    class RecordingMailSender : JavaMailSenderImpl() {
        val sentSubjects = ConcurrentLinkedQueue<String>()

        /** Kills the next send the way a `SIGKILL` would: past the point of no return, unrecorded. */
        @Volatile
        var killNextSend = false

        override fun send(vararg mimeMessages: MimeMessage) {
            if (killNextSend) {
                killNextSend = false
                throw OutOfMemoryError("killed mid-send")
            }

            Thread.sleep(50)
            mimeMessages.forEach { sentSubjects.add(it.subject) }
        }
    }

    @TestConfiguration
    class TestMailConfig {
        @Bean
        @Primary
        fun shiftedClock(): Clock = Clock.offset(Clock.systemDefaultZone(), CLOCK_OFFSET)

        @Bean
        fun recordingMailSender() = RecordingMailSender()
    }

    @Autowired
    private lateinit var mailOutboxService: MailOutboxService

    @Autowired
    private lateinit var mailOutboxRepository: MailOutboxRepository

    @Autowired
    private lateinit var recordingMailSender: RecordingMailSender

    @BeforeEach
    @AfterEach
    fun emptyTheQueue() {
        mailOutboxRepository.deleteAllInBatch()
        recordingMailSender.sentSubjects.clear()
        recordingMailSender.killNextSend = false
    }

    @Test
    fun `two pollers working the same queue send every mail exactly once`() {
        val queuedMails = givenDueMails()
        val queuedSubjects = queuedMails.map { it.subject!! }

        val barrier = CyclicBarrier(2)
        val executor = Executors.newFixedThreadPool(2)
        try {
            (1..2).map {
                executor.submit {
                    barrier.await(10, TimeUnit.SECONDS)
                    mailOutboxService.sendPendingMails()
                }
            }.forEach { it.get(60, TimeUnit.SECONDS) }
        } finally {
            executor.shutdownNow()
        }

        assertThat(recordingMailSender.sentSubjects)
            .doesNotHaveDuplicates()
            .containsExactlyInAnyOrderElementsOf(queuedSubjects)
        assertThat(mailOutboxRepository.findAllById(queuedMails.map { it.id!! }))
            .hasSize(MAIL_COUNT)
            .allMatch { it.status == MailOutboxStatus.SENT }
            .allMatch { it.attempts == 1 }
    }

    /**
     * The other half of holding the lock across the send: it lasts exactly as long as the
     * transaction that took the mail, so a poller that dies mid-send leaves the row `PENDING` for
     * the next poll instead of a state somebody has to clean up. Nothing is stranded and nothing is
     * a duplicate - the send and its outcome are one transaction.
     */
    @Test
    fun `a poll that dies mid-send leaves its mail for the next one`() {
        val mail = givenDueMails(count = 1).single()
        recordingMailSender.killNextSend = true

        runCatching { mailOutboxService.sendPendingMails() }

        val untouchedMail = mailOutboxRepository.findById(mail.id!!).orElseThrow()
        assertThat(untouchedMail.status).isEqualTo(MailOutboxStatus.PENDING)
        assertThat(untouchedMail.attempts).isZero()
        assertThat(recordingMailSender.sentSubjects).isEmpty()

        mailOutboxService.sendPendingMails()

        assertThat(recordingMailSender.sentSubjects).containsExactly(mail.subject)
        assertThat(mailOutboxRepository.findById(mail.id!!).orElseThrow().status).isEqualTo(MailOutboxStatus.SENT)
    }

    private fun givenDueMails(count: Int = MAIL_COUNT) = mailOutboxRepository.saveAll(
        (1..count).map { index ->
            MailOutboxEntity().apply {
                createdAt = LocalDateTime.now()
                subject = "concurrent test $index"
                recipients = "concurrent-test@localhost"
                message = mimeMessageBytes("concurrent test $index")
                status = MailOutboxStatus.PENDING
                nextAttemptAt = LocalDateTime.now().plus(FIXTURE_DUE_IN)
            }
        },
    )

    private fun mimeMessageBytes(subject: String): ByteArray {
        val mimeMessage = recordingMailSender.createMimeMessage().apply {
            setSubject(subject)
            setText("text")
            saveChanges()
        }
        return ByteArrayOutputStream().also { mimeMessage.writeTo(it) }.toByteArray()
    }
}
