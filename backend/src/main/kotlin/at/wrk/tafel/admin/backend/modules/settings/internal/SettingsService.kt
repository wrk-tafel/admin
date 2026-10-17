package at.wrk.tafel.admin.backend.modules.settings.internal

import at.wrk.tafel.admin.backend.database.model.base.MailRecipientEntity
import at.wrk.tafel.admin.backend.database.model.base.MailRecipientRepository
import at.wrk.tafel.admin.backend.database.model.base.MailType
import at.wrk.tafel.admin.backend.database.model.base.RecipientType
import at.wrk.tafel.admin.backend.database.model.staticdata.StaticValueEntity
import at.wrk.tafel.admin.backend.database.model.staticdata.StaticValueRepository
import at.wrk.tafel.admin.backend.modules.base.exception.BusinessRuleException
import at.wrk.tafel.admin.backend.modules.base.exception.ConflictException
import at.wrk.tafel.admin.backend.modules.base.exception.NotFoundException
import at.wrk.tafel.admin.backend.modules.settings.model.MailRecipientAddressItem
import at.wrk.tafel.admin.backend.modules.settings.model.MailRecipientAdresses
import at.wrk.tafel.admin.backend.modules.settings.model.MailRecipientType
import at.wrk.tafel.admin.backend.modules.settings.model.MailRecipientsPerMailType
import at.wrk.tafel.admin.backend.modules.settings.model.MailRecipientsRequest
import at.wrk.tafel.admin.backend.modules.settings.model.MailRecipientsResponse
import at.wrk.tafel.admin.backend.modules.settings.model.ScheduledStaticValue
import at.wrk.tafel.admin.backend.modules.settings.model.StaticValueListResponse
import at.wrk.tafel.admin.backend.modules.settings.model.StaticValueRequest
import at.wrk.tafel.admin.backend.modules.settings.model.StaticValueResponse
import org.slf4j.LoggerFactory
import org.springframework.data.repository.findByIdOrNull
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional
import java.math.BigDecimal
import java.time.LocalDate

@Service
class SettingsService(
    private val mailRecipientRepository: MailRecipientRepository,
    private val staticValueRepository: StaticValueRepository,
) {

    companion object {
        // Placeholder "no known end date" marker used throughout static_values (see migrations/testdata)
        private val FICTIVE_END_DATE = LocalDate.of(2999, 12, 31)
        private val log = LoggerFactory.getLogger(SettingsService::class.java)
    }

    fun getMailRecipients(): MailRecipientsResponse {
        val recipientsPerMailType = mailRecipientRepository.findAll().groupBy { it.mailType }
        val mailRecipients = recipientsPerMailType.entries.map {
            val mailType = it.key
            val recipients = it.value

            mapToMailRecipientSetting(mailType, recipients)
        }

        return MailRecipientsResponse(mailRecipients = mailRecipients)
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
                    recipientType = MailRecipientType.valueOf(recipientsPerType.key.name.uppercase()),
                    addresses = recipientsPerType.value.map { MailRecipientAddressItem(id = it.id, address = it.address) },
                )
            },
        )
    }

    // An upsert, not a diff: deletion of a single row is a separate, real DELETE (see
    // deleteMailRecipient) invoked immediately by the frontend, so this only ever needs to add new
    // addresses (id == null) and update the text of existing ones (id present) - it never deletes,
    // which keeps an untouched row's id (and thus its eligibility for that immediate delete) stable
    // across saves. Returns the persisted state (with the ids newly-created addresses were assigned)
    // so the frontend can make those rows deletable without a separate reload.
    @Transactional
    fun updateMailRecipients(settings: MailRecipientsRequest): MailRecipientsResponse {
        val requestedItems = settings.mailRecipients.flatMap { mailRecipient ->
            val mailType = parseMailType(mailRecipient.mailType)
            mailRecipient.recipients.flatMap { (updatedRecipientType, updatedAddresses) ->
                updatedAddresses
                    .filter { it.address.trim().isNotBlank() }
                    .map { addressItem -> Triple(mailType, updatedRecipientType, addressItem) }
            }
        }

        val existingById = mailRecipientRepository.findAllById(requestedItems.mapNotNull { it.third.id })
            .associateBy { it.id }

        val toSave = requestedItems.map { (mailType, recipientType, addressItem) ->
            val recipientTypeEntity = RecipientType.valueOf(recipientType.name.uppercase())
            val entity = addressItem.id?.let { existingById[it] }
            if (entity != null) {
                // The id's own (mailType, recipientType) group must match what it was submitted
                // under - without this check, an id posted under a different group than the one it
                // currently belongs to would silently re-parent an existing address instead of being
                // rejected.
                if (entity.mailType != mailType || entity.recipientType != recipientTypeEntity) {
                    throw ConflictException(
                        "E-Mail Empfänger (ID: ${addressItem.id}) gehört nicht zu ${mailType.name}/${recipientType.name}!",
                    )
                }
                entity.address = addressItem.address
                entity
            } else {
                MailRecipientEntity(
                    mailType = mailType,
                    recipientType = recipientTypeEntity,
                    address = addressItem.address,
                )
            }
        }

        mailRecipientRepository.saveAll(toSave)
        log.info("Updated mail recipients ({} entries across {} mail type(s))", toSave.size, settings.mailRecipients.size)
        return getMailRecipients()
    }

    // MailType.valueOf on an unknown/malformed value would otherwise surface as an uncaught
    // IllegalArgumentException - a 500 for what is a plain 400-shaped input problem.
    private fun parseMailType(mailType: String): MailType = runCatching { MailType.valueOf(mailType) }
        .getOrElse { throw BusinessRuleException("Unbekannter Mailtyp: $mailType") }

    @Transactional
    fun deleteMailRecipient(id: Long) {
        if (!mailRecipientRepository.existsById(id)) {
            throw NotFoundException("E-Mail Empfänger (ID: $id) nicht vorhanden!")
        }
        mailRecipientRepository.deleteById(id)
        log.info("Deleted mail recipient {}", id)
    }

    // Shows the row currently valid "today" per (type, countAdults, countChildren, age), together with
    // the amount already planned to take over from it (see scheduleStaticValue) - history rows are
    // hidden, admins only maintain what applies now and what applies next.
    fun getStaticValues(): StaticValueListResponse {
        val today = LocalDate.now()
        val allValues = staticValueRepository.findAll()
        val staticValues = allValues
            .filter { isCurrentlyValid(it, today) }
            .sortedWith(compareBy({ it.type }, { it.countAdults }, { it.countChildren }, { it.age }, { it.id }))
            .map { mapStaticValue(it, scheduledOf(it, allValues, today)) }

        return StaticValueListResponse(staticValues = staticValues)
    }

    // Only the amount and the date it applies from are editable - type/countAdults/countChildren/age
    // identify which row a lookup matches (see StaticValueRepository), so changing them here could
    // silently break that matching.
    //
    // A date of today or earlier applies the amount now: the currently valid row is closed off as of
    // yesterday and a new row starting today takes over until the end of the current row's window -
    // unless the currently valid row already started today (i.e. it was itself created by an earlier
    // edit made today), in which case that same-day row is updated in place instead of stacking up
    // multiple same-day history entries. A later date plans the amount instead (scheduleStaticValue),
    // and the id of a planned row changes that plan.
    @Transactional
    fun updateStaticValue(staticValueId: Long, item: StaticValueRequest): StaticValueResponse {
        val entity = staticValueRepository.findByIdOrNull(staticValueId)
            ?: throw NotFoundException("Statischer Wert mit ID $staticValueId nicht gefunden")
        val amount = item.amount ?: throw BusinessRuleException("Betrag ist erforderlich!")

        val today = LocalDate.now()

        if (entity.validFrom.isAfter(today)) {
            return reschedule(entity, item.validFrom, amount, today)
        }

        // The given row must still be the one currently valid "today" - a stale one (already closed
        // off by a concurrent edit, e.g. two tabs on the same value) would otherwise be historized a
        // second time, leaving two rows both valid today for the same (type, countAdults,
        // countChildren, age) and breaking findSingleValueOfType's single-row assumption for every
        // later lookup until fixed by hand.
        if (!isCurrentlyValid(entity, today)) {
            throw ConflictException(
                "Statischer Wert mit ID $staticValueId wurde zwischenzeitlich bereits geändert - bitte Seite neu laden!",
            )
        }

        if (item.validFrom.isAfter(today)) {
            return scheduleStaticValue(entity, item.validFrom, amount, today)
        }

        if (entity.validFrom == today) {
            entity.amount = amount
            val savedEntity = staticValueRepository.save(entity)
            log.info("Updated static value {} ({}) to {}", staticValueId, entity.type, amount)
            return mapStaticValue(savedEntity)
        }

        // The new row ends where the current one did, so an amount already planned for a later date
        // (whose row starts the day after) still takes over then.
        val historizedEntity = copyWith(entity, validFrom = today, validTo = entity.validTo, amount = amount)
        entity.validTo = today.minusDays(1)
        staticValueRepository.save(entity)

        val savedEntity = staticValueRepository.save(historizedEntity)
        log.info("Updated static value {} ({}) to {} (historized as new entry {})", staticValueId, entity.type, amount, savedEntity.id)
        return mapStaticValue(savedEntity)
    }

    // Removes an amount planned for a later date; the row it would have replaced stays valid in its
    // place. Only a planned row can be removed - a current or past one is the record of what applied.
    @Transactional
    fun deleteStaticValue(staticValueId: Long) {
        val entity = staticValueRepository.findByIdOrNull(staticValueId)
            ?: throw NotFoundException("Statischer Wert mit ID $staticValueId nicht gefunden")
        val today = LocalDate.now()
        if (!entity.validFrom.isAfter(today)) {
            throw BusinessRuleException("Nur ein geplanter Wert kann entfernt werden!")
        }

        predecessorOf(entity)?.let {
            it.validTo = entity.validTo
            staticValueRepository.save(it)
        }
        staticValueRepository.delete(entity)
        log.info("Removed static value {} ({}) planned from {}", staticValueId, entity.type, entity.validFrom)
    }

    // Plans [amount] to replace the currently valid [current] row from [validFrom] on. There is at most
    // one plan per row: one that already exists is changed instead of a second one stacked behind it.
    private fun scheduleStaticValue(
        current: StaticValueEntity,
        validFrom: LocalDate,
        amount: BigDecimal,
        today: LocalDate,
    ): StaticValueResponse {
        val planned = scheduledOf(current, staticValueRepository.findAll(), today)
        if (planned != null) {
            return reschedule(planned, validFrom, amount, today)
        }

        val scheduledEntity = copyWith(current, validFrom = validFrom, validTo = current.validTo, amount = amount)
        current.validTo = validFrom.minusDays(1)
        staticValueRepository.save(current)

        val savedEntity = staticValueRepository.save(scheduledEntity)
        log.info("Planned static value {} ({}) as {} from {} (new entry {})", current.id, current.type, amount, validFrom, savedEntity.id)
        return mapStaticValue(savedEntity)
    }

    private fun reschedule(
        planned: StaticValueEntity,
        validFrom: LocalDate,
        amount: BigDecimal,
        today: LocalDate,
    ): StaticValueResponse {
        if (!validFrom.isAfter(today)) {
            throw BusinessRuleException("Ein geplanter Wert muss ab einem Datum in der Zukunft gelten!")
        }
        if (validFrom.isAfter(planned.validTo)) {
            throw BusinessRuleException("Das Datum liegt nach dem Ende des geplanten Werts!")
        }

        if (validFrom != planned.validFrom) {
            predecessorOf(planned)?.let {
                it.validTo = validFrom.minusDays(1)
                staticValueRepository.save(it)
            }
            planned.validFrom = validFrom
        }
        planned.amount = amount

        val savedEntity = staticValueRepository.save(planned)
        log.info("Changed planned static value {} ({}) to {} from {}", planned.id, planned.type, amount, validFrom)
        return mapStaticValue(savedEntity)
    }

    // The earliest row of the same lookup key that only starts after [today].
    private fun scheduledOf(
        entity: StaticValueEntity,
        allValues: List<StaticValueEntity>,
        today: LocalDate,
    ): StaticValueEntity? = allValues
        .filter { it.validFrom.isAfter(today) && hasSameKey(it, entity) }
        .minByOrNull { it.validFrom }

    // The row of the same lookup key that ends the day before [entity] starts.
    private fun predecessorOf(entity: StaticValueEntity): StaticValueEntity? = staticValueRepository.findAll()
        .firstOrNull { hasSameKey(it, entity) && it.validTo == entity.validFrom.minusDays(1) }

    private fun hasSameKey(a: StaticValueEntity, b: StaticValueEntity): Boolean = a.id != b.id &&
        a.type == b.type &&
        a.countAdults == b.countAdults &&
        a.countChildren == b.countChildren &&
        a.age == b.age

    private fun copyWith(entity: StaticValueEntity, validFrom: LocalDate, validTo: LocalDate, amount: BigDecimal) = StaticValueEntity(
        validFrom = validFrom,
        validTo = validTo,
        type = entity.type,
        amount = amount,
    ).apply {
        countAdults = entity.countAdults
        countChildren = entity.countChildren
        age = entity.age
    }

    private fun isCurrentlyValid(entity: StaticValueEntity, today: LocalDate): Boolean = !today.isBefore(entity.validFrom) && !today.isAfter(entity.validTo)

    private fun mapStaticValue(entity: StaticValueEntity, scheduled: StaticValueEntity? = null): StaticValueResponse = StaticValueResponse(
        id = entity.id,
        type = entity.type.name,
        validFrom = entity.validFrom,
        validTo = entity.validTo,
        amount = entity.amount,
        countAdults = entity.countAdults,
        countChildren = entity.countChildren,
        age = entity.age,
        scheduled = scheduled?.let { ScheduledStaticValue(id = it.id, validFrom = it.validFrom, amount = it.amount) },
    )
}
