package at.wrk.tafel.admin.backend.modules.settings.internal

import at.wrk.tafel.admin.backend.database.model.base.MailRecipientEntity
import at.wrk.tafel.admin.backend.database.model.base.MailRecipientRepository
import at.wrk.tafel.admin.backend.database.model.base.MailType
import at.wrk.tafel.admin.backend.database.model.base.RecipientType
import at.wrk.tafel.admin.backend.modules.settings.model.MailRecipientAdresses
import at.wrk.tafel.admin.backend.modules.settings.model.MailRecipientType
import at.wrk.tafel.admin.backend.modules.settings.model.MailRecipients
import at.wrk.tafel.admin.backend.modules.settings.model.MailRecipientsPerMailType
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional

@Service
class SettingsService(
    private val mailRecipientRepository: MailRecipientRepository,
) {

    fun getMailRecipients(): MailRecipients {
        val recipientsPerMailType = mailRecipientRepository.findAll().groupBy { it.mailType }
        val mailRecipients = recipientsPerMailType.entries.map {
            val mailType = it.key
            val recipients = it.value

            mapToMailRecipientSetting(mailType!!, recipients)
        }

        return MailRecipients(mailRecipients = mailRecipients)
    }

    private fun mapToMailRecipientSetting(
        mailType: MailType,
        recipients: List<MailRecipientEntity>,
    ): MailRecipientsPerMailType {
        val groupedByType = recipients.groupBy { it.recipientType }

        return MailRecipientsPerMailType(
            mailType = mailType.name,
            recipients = groupedByType.entries.map { recipientsPerType ->
                MailRecipientAdresses(
                    recipientType = MailRecipientType.valueOf(recipientsPerType.key!!.name.uppercase()),
                    addresses = recipientsPerType.value.map { it.address!! }
                )
            }
        )
    }

    @Transactional
    fun updateMailRecipients(settings: MailRecipients) {
        val recipients = settings.mailRecipients.flatMap { mailRecipient ->
            mailRecipient.recipients.flatMap { (updatedRecipientType, updatedRecipients) ->
                updatedRecipients
                    .filter { it.trim().isNotBlank() }
                    .map { updatedRecipient ->
                        MailRecipientEntity().apply {
                            mailType = MailType.valueOf(mailRecipient.mailType)
                            recipientType = RecipientType.valueOf(updatedRecipientType.name.uppercase())
                            address = updatedRecipient
                        }
                    }
            }
        }

        mailRecipientRepository.deleteAll()
        mailRecipientRepository.saveAll(recipients)
    }

}
