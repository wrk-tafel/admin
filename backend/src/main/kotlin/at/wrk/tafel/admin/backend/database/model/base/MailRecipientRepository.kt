package at.wrk.tafel.admin.backend.database.model.base

import org.springframework.data.jpa.repository.JpaRepository

interface MailRecipientRepository : JpaRepository<MailRecipientEntity, Long> {

    fun findAllByMailType(mailType: MailType): List<MailRecipientEntity>

}
