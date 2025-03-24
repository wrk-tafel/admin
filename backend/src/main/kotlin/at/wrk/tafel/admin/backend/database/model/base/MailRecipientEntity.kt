package at.wrk.tafel.admin.backend.database.model.base

import at.wrk.tafel.admin.backend.common.ExcludeFromTestCoverage
import jakarta.persistence.Column
import jakarta.persistence.Entity
import jakarta.persistence.EnumType
import jakarta.persistence.Enumerated
import jakarta.persistence.Table

@Entity(name = "MailRecipient")
@Table(name = "mail_recipients")
@ExcludeFromTestCoverage
class MailRecipientEntity : BaseEntity() {

    @Column(name = "mail_type")
    @Enumerated(EnumType.STRING)
    var mailType: MailType? = null

    @Column(name = "recipient_type")
    @Enumerated(EnumType.STRING)
    var recipientType: RecipientType? = null

    @Column(name = "address")
    var address: String? = null

}

enum class MailType {
    DAILY_REPORT, STATISTICS, RETURN_BOXES
}

enum class RecipientType {
    TO, CC, BCC
}
