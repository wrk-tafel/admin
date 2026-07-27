package at.wrk.tafel.admin.backend.modules.settings.internal

import at.wrk.tafel.admin.backend.database.model.base.MailRecipientEntity
import at.wrk.tafel.admin.backend.database.model.base.MailRecipientRepository
import at.wrk.tafel.admin.backend.database.model.base.MailType
import at.wrk.tafel.admin.backend.database.model.base.RecipientType
import at.wrk.tafel.admin.backend.database.model.staticdata.StaticValueEntity
import at.wrk.tafel.admin.backend.database.model.staticdata.StaticValueRepository
import at.wrk.tafel.admin.backend.modules.base.exception.TafelValidationException
import at.wrk.tafel.admin.backend.modules.settings.model.MailRecipientAdresses
import at.wrk.tafel.admin.backend.modules.settings.model.MailRecipientType
import at.wrk.tafel.admin.backend.modules.settings.model.MailRecipients
import at.wrk.tafel.admin.backend.modules.settings.model.MailRecipientsPerMailType
import at.wrk.tafel.admin.backend.modules.settings.model.StaticValueItem
import at.wrk.tafel.admin.backend.modules.settings.model.StaticValueListResponse
import org.springframework.cache.annotation.CacheEvict
import org.springframework.data.repository.findByIdOrNull
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional

@Service
class SettingsService(
    private val mailRecipientRepository: MailRecipientRepository,
    private val staticValueRepository: StaticValueRepository,
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

    fun getStaticValues(): StaticValueListResponse {
        val staticValues = staticValueRepository.findAll()
            .sortedWith(compareBy({ it.type }, { it.validFrom }, { it.countAdults }, { it.countChildren }, { it.age }, { it.id }))
            .map { mapStaticValue(it) }

        return StaticValueListResponse(staticValues = staticValues)
    }

    // Only the amount is editable - type/validFrom/validTo/countAdults/countChildren/age identify
    // which row a lookup matches (see StaticValueRepository), so changing them here could silently
    // break that matching; rows are shown for context but only ever created via a DB migration.
    @Transactional
    @CacheEvict(
        cacheNames = ["staticValueLatestForPersonCount", "staticValueSingle", "staticValueList"],
        allEntries = true,
    )
    fun updateStaticValue(staticValueId: Long, item: StaticValueItem): StaticValueItem {
        val entity = staticValueRepository.findByIdOrNull(staticValueId)
            ?: throw TafelValidationException("Statischer Wert mit ID $staticValueId nicht gefunden")

        entity.amount = item.amount

        return mapStaticValue(staticValueRepository.save(entity))
    }

    private fun mapStaticValue(entity: StaticValueEntity): StaticValueItem {
        return StaticValueItem(
            id = entity.id,
            type = entity.type!!.name,
            validFrom = entity.validFrom!!,
            validTo = entity.validTo!!,
            amount = entity.amount,
            countAdults = entity.countAdults,
            countChildren = entity.countChildren,
            age = entity.age,
        )
    }

}
