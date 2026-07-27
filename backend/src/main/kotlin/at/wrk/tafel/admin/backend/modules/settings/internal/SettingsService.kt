package at.wrk.tafel.admin.backend.modules.settings.internal

import at.wrk.tafel.admin.backend.database.model.base.MailRecipientEntity
import at.wrk.tafel.admin.backend.database.model.base.MailRecipientRepository
import at.wrk.tafel.admin.backend.database.model.base.MailType
import at.wrk.tafel.admin.backend.database.model.base.RecipientType
import at.wrk.tafel.admin.backend.database.model.staticdata.StaticValueEntity
import at.wrk.tafel.admin.backend.database.model.staticdata.StaticValueRepository
import at.wrk.tafel.admin.backend.database.model.staticdata.StaticValueType
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

    @Transactional
    @CacheEvict(
        cacheNames = ["staticValueLatestForPersonCount", "staticValueSingle", "staticValueList"],
        allEntries = true,
    )
    fun createStaticValue(item: StaticValueItem): StaticValueItem {
        val type = parseType(item.type)
        validateDateRange(item.validFrom, item.validTo)
        validateNoOverlap(type, item.countAdults, item.countChildren, item.validFrom, item.validTo, excludeId = null)

        val entity = StaticValueEntity().apply {
            this.type = type
            validFrom = item.validFrom
            validTo = item.validTo
            amount = item.amount
            countAdults = item.countAdults
            countChildren = item.countChildren
            age = item.age
        }

        return mapStaticValue(staticValueRepository.save(entity))
    }

    @Transactional
    @CacheEvict(
        cacheNames = ["staticValueLatestForPersonCount", "staticValueSingle", "staticValueList"],
        allEntries = true,
    )
    fun updateStaticValue(staticValueId: Long, item: StaticValueItem): StaticValueItem {
        val entity = staticValueRepository.findByIdOrNull(staticValueId)
            ?: throw TafelValidationException("Statischer Wert mit ID $staticValueId nicht gefunden")

        val type = parseType(item.type)
        validateDateRange(item.validFrom, item.validTo)
        validateNoOverlap(type, item.countAdults, item.countChildren, item.validFrom, item.validTo, excludeId = staticValueId)

        entity.type = type
        entity.validFrom = item.validFrom
        entity.validTo = item.validTo
        entity.amount = item.amount
        entity.countAdults = item.countAdults
        entity.countChildren = item.countChildren
        entity.age = item.age

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

    private fun parseType(type: String): StaticValueType {
        return try {
            StaticValueType.valueOf(type)
        } catch (e: IllegalArgumentException) {
            throw TafelValidationException("Unbekannter Typ: $type")
        }
    }

    private fun validateDateRange(validFrom: LocalDate, validTo: LocalDate) {
        if (validFrom.isAfter(validTo)) {
            throw TafelValidationException("\"Gültig von\" darf nicht nach \"Gültig bis\" liegen")
        }
    }

    // Guards the invariant the single-result repository lookups rely on: at most one row may match
    // per date for a given type, since Spring Data throws IncorrectResultSizeDataAccessException if
    // more than one row matches a query whose return type is a single entity. The exact key differs
    // per lookup method: findLatestForPersonCount (INCOME_LIMIT only) additionally filters by
    // countAdults/countChildren, so only same-count rows conflict; findSingleValueOfType (TOLERANCE,
    // ADDITIONAL_ADULT, ADDITIONAL_CHILD, CHILD_TAX_ALLOWANCE, COST_CONTRIBUTION) filters only by
    // type, so ANY overlapping row of that type conflicts regardless of counts. FAMILY_BONUS/
    // SIBLING_ADDITION are read via findValuesOfType (a list), so overlaps there are never a problem.
    private fun validateNoOverlap(
        type: StaticValueType,
        countAdults: Int?,
        countChildren: Int?,
        validFrom: LocalDate,
        validTo: LocalDate,
        excludeId: Long?,
    ) {
        val overlaps = staticValueRepository.findAll().any { existing ->
            existing.id != excludeId &&
                existing.type == type &&
                existing.validFrom != null && existing.validTo != null &&
                !(validTo.isBefore(existing.validFrom) || validFrom.isAfter(existing.validTo)) &&
                when (type) {
                    StaticValueType.FAMILY_BONUS, StaticValueType.SIBLING_ADDITION -> false
                    StaticValueType.INCOME_LIMIT -> existing.countAdults == countAdults && existing.countChildren == countChildren
                    else -> true
                }
        }

        if (overlaps) {
            throw TafelValidationException(
                "Es existiert bereits ein Wert für diesen Typ mit überschneidendem Gültigkeitszeitraum"
            )
        }
    }

}
