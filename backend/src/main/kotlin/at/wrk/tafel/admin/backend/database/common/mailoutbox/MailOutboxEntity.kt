package at.wrk.tafel.admin.backend.database.common.mailoutbox

import at.wrk.tafel.admin.backend.common.ExcludeFromTestCoverage
import at.wrk.tafel.admin.backend.database.model.base.BaseEntity
import at.wrk.tafel.admin.backend.database.model.base.MailType
import jakarta.persistence.Column
import jakarta.persistence.Entity
import jakarta.persistence.EnumType
import jakarta.persistence.Enumerated
import jakarta.persistence.Table
import java.time.LocalDateTime

/**
 * One mail waiting to leave the building, stored as the finished MIME message it will be sent as.
 *
 * The composed message rather than its ingredients: it is what the mail server gets either way, it
 * cannot drift from what the sending code meant at the time, and it keeps a report's attachments
 * (PDFs, CSVs) in the same row as the mail they belong to.
 */
@Entity(name = "MailOutbox")
@Table(name = "mail_outbox")
@ExcludeFromTestCoverage
class MailOutboxEntity : BaseEntity() {

    @Column(name = "created_at")
    var createdAt: LocalDateTime? = null

    // Subject and recipients are duplicated out of the message purely so the queue can be read -
    // in a log line, or in the database during a support call - without parsing MIME.
    @Column(name = "subject")
    var subject: String? = null

    @Column(name = "recipients")
    var recipients: String? = null

    @Column(name = "message")
    var message: ByteArray? = null

    /**
     * Which of the maintained mail types this message is, so the e-mail settings screen can report
     * how the last one of each type ended. `null` for a mail whose recipients do not come from
     * `mail_recipients` at all - the support request.
     */
    @Column(name = "mail_type")
    @Enumerated(EnumType.STRING)
    var mailType: MailType? = null

    @Column(name = "status")
    @Enumerated(EnumType.STRING)
    var status: MailOutboxStatus = MailOutboxStatus.PENDING

    @Column(name = "attempts")
    var attempts: Int = 0

    @Column(name = "next_attempt_at")
    var nextAttemptAt: LocalDateTime? = null

    @Column(name = "last_error")
    var lastError: String? = null

    @Column(name = "sent_at")
    var sentAt: LocalDateTime? = null
}

enum class MailOutboxStatus {
    PENDING,
    SENT,

    /**
     * Given up on after the last retry. Kept far longer than a sent mail - a mail nobody received is
     * exactly the thing someone has to be able to find afterwards, together with `lastError` - but
     * still only until `tafeladmin.mailOutbox.failedRetention` has passed, because the row holds the
     * whole message and nothing else would ever remove that copy.
     */
    FAILED,
}
