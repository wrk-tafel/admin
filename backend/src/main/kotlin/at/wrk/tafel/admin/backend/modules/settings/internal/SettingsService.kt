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
import java.time.LocalDate

@Service
class SettingsService(
    private val mailRecipientRepository: MailRecipientRepository,
    private val staticValueRepository: StaticValueRepository,
) {

    companion object {
        // Placeholder "no known end date" marker used throughout static_values (see migrations/testdata)
        private val FICTIVE_END_DATE = LocalDate.of(2999, 12, 31)
    }

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
                    addresses = recipientsPerType.value.map { it.address!! },
                )
            },
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

    // Only ever shows the row currently valid "today" per (type, countAdults, countChildren, age) -
    // historical/future rows created by updateStaticValue's historization are hidden, since admins
    // only ever need to see/maintain the value that applies right now.
    fun getStaticValues(): StaticValueListResponse {
        val today = LocalDate.now()
        val staticValues = staticValueRepository.findAll()
            .filter { isCurrentlyValid(it, today) }
            .sortedWith(compareBy({ it.type }, { it.countAdults }, { it.countChildren }, { it.age }, { it.id }))
            .map { mapStaticValue(it) }

        return StaticValueListResponse(staticValues = staticValues)
    }

    // Only the amount is editable - type/countAdults/countChildren/age identify which row a lookup
    // matches (see StaticValueRepository), so changing them here could silently break that matching.
    // Changes are historized rather than overwritten in place: the currently valid row is closed off
    // as of yesterday and a new row starting today (open-ended until FICTIVE_END_DATE) takes over with
    // the new amount - unless the currently valid row already started today (i.e. it was itself
    // created by an earlier edit made today), in which case that same-day row is updated in place
    // instead of stacking up multiple same-day history entries.
    @Transactional
    @CacheEvict(
        cacheNames = ["staticValueLatestForPersonCount", "staticValueSingle", "staticValueList"],
        allEntries = true,
    )
    fun updateStaticValue(staticValueId: Long, item: StaticValueItem): StaticValueItem {
        val entity = staticValueRepository.findByIdOrNull(staticValueId)
            ?: throw TafelValidationException("Statischer Wert mit ID $staticValueId nicht gefunden")

        val today = LocalDate.now()

        if (entity.validFrom == today) {
            entity.amount = item.amount
            return mapStaticValue(staticValueRepository.save(entity))
        }

        entity.validTo = today.minusDays(1)
        staticValueRepository.save(entity)

        val historizedEntity = StaticValueEntity().apply {
            type = entity.type
            validFrom = today
            validTo = FICTIVE_END_DATE
            amount = item.amount
            countAdults = entity.countAdults
            countChildren = entity.countChildren
            age = entity.age
        }

        return mapStaticValue(staticValueRepository.save(historizedEntity))
    }

    private fun isCurrentlyValid(entity: StaticValueEntity, today: LocalDate): Boolean {
        val validFrom = entity.validFrom
        val validTo = entity.validTo
        return validFrom != null && validTo != null && !today.isBefore(validFrom) && !today.isAfter(validTo)
    }

    private fun mapStaticValue(entity: StaticValueEntity): StaticValueItem = StaticValueItem(
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
