package at.wrk.tafel.admin.backend.modules.settings.internal

import at.wrk.tafel.admin.backend.database.model.base.MailRecipientEntity
import at.wrk.tafel.admin.backend.database.model.base.MailRecipientRepository
import at.wrk.tafel.admin.backend.database.model.base.MailType
import at.wrk.tafel.admin.backend.database.model.base.RecipientType
import at.wrk.tafel.admin.backend.modules.settings.model.MailRecipientSetting
import at.wrk.tafel.admin.backend.modules.settings.model.MailRecipientSettings
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional
import at.wrk.tafel.admin.backend.modules.settings.model.MailType as ResponseMailType

@Service
class SettingsService(
    private val mailRecipientRepository: MailRecipientRepository,
) {

    fun getMailRecipients(): MailRecipientSettings {
        val recipientsPerMailType = mailRecipientRepository.findAll().groupBy { it.mailType }
        val settings = recipientsPerMailType.entries.map {
            val mailType = it.key
            val recipients = it.value

            mapToMailRecipientSetting(mailType!!, recipients)
        }

        return MailRecipientSettings(settings = settings)
    }

    private fun mapToMailRecipientSetting(
        mailType: MailType,
        recipients: List<MailRecipientEntity>,
    ): MailRecipientSetting {
        return MailRecipientSetting(mailType = mapMailTypeToResponse(mailType),
            recipients = recipients.groupBy { mailRecipientEntity ->
                mailRecipientEntity.recipientType!!.name.lowercase().replaceFirstChar { it.uppercase() }
            }.mapValues { recipientsOfType -> recipientsOfType.value.map { it.recipient!! } })
    }

    private fun mapMailTypeToResponse(mailType: MailType): ResponseMailType {
        return when (mailType) {
            MailType.DAILY_REPORT -> ResponseMailType(
                name = mailType.name,
                label = "Tagesreport",
            )

            MailType.STATISTICS -> ResponseMailType(
                name = mailType.name,
                label = "Statistiken",
            )

            MailType.RETURN_BOXES -> ResponseMailType(
                name = mailType.name,
                label = "Retourkisten",
            )
        }
    }

    @Transactional
    fun updateMailRecipients(settings: MailRecipientSettings) {
        val recipients = settings.settings.flatMap { setting ->
            setting.recipients.flatMap { (updatedRecipientType, updatedRecipients) ->
                updatedRecipients.map { updatedRecipient ->
                    MailRecipientEntity().apply {
                        mailType = MailType.valueOf(setting.mailType.name)
                        recipientType = RecipientType.valueOf(updatedRecipientType.uppercase())
                        recipient = updatedRecipient
                    }
                }
            }
        }

        mailRecipientRepository.deleteAll()
        mailRecipientRepository.saveAll(recipients)
    }

}
