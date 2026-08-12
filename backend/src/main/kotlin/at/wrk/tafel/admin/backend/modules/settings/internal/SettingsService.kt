package at.wrk.tafel.admin.backend.modules.settings.internal

import at.wrk.tafel.admin.backend.database.common.mailoutbox.MailOutboxRepository
import at.wrk.tafel.admin.backend.database.model.base.MailRecipientEntity
import at.wrk.tafel.admin.backend.database.model.base.MailRecipientRepository
import at.wrk.tafel.admin.backend.database.model.base.MailType
import at.wrk.tafel.admin.backend.database.model.base.RecipientType
import at.wrk.tafel.admin.backend.database.model.staticdata.StaticValueEntity
import at.wrk.tafel.admin.backend.database.model.staticdata.StaticValueRepository
import at.wrk.tafel.admin.backend.modules.base.exception.BusinessRuleException
import at.wrk.tafel.admin.backend.modules.base.exception.NotFoundException
import at.wrk.tafel.admin.backend.modules.settings.model.MailRecipientAdresses
import at.wrk.tafel.admin.backend.modules.settings.model.MailRecipientType
import at.wrk.tafel.admin.backend.modules.settings.model.MailRecipientsPerMailType
import at.wrk.tafel.admin.backend.modules.settings.model.MailRecipientsRequest
import at.wrk.tafel.admin.backend.modules.settings.model.MailRecipientsResponse
import at.wrk.tafel.admin.backend.modules.settings.model.MailStatusItem
import at.wrk.tafel.admin.backend.modules.settings.model.MailStatusListResponse
import at.wrk.tafel.admin.backend.modules.settings.model.StaticValueListResponse
import at.wrk.tafel.admin.backend.modules.settings.model.StaticValueRequest
import at.wrk.tafel.admin.backend.modules.settings.model.StaticValueResponse
import org.slf4j.LoggerFactory
import org.springframework.data.repository.findByIdOrNull
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional
import java.time.LocalDate

@Service
class SettingsService(
    private val mailRecipientRepository: MailRecipientRepository,
    private val staticValueRepository: StaticValueRepository,
    private val mailOutboxRepository: MailOutboxRepository,
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
                    addresses = recipientsPerType.value.map { it.address },
                )
            },
        )
    }

    /**
     * How the last mail of every type ended - "did yesterday's report actually go out?", answered
     * from the outbox rather than from a log file.
     *
     * Only the *last* one per type: the screen's question is whether the current recipients are
     * receiving anything, not a delivery history, and every earlier mail leaves the queue once its
     * retention has passed anyway (see `MailOutboxService.cleanupOldMails`).
     */
    fun getMailStatus(): MailStatusListResponse {
        val mailStatus = MailType.entries.map { mailType ->
            val lastMail = mailOutboxRepository.findFirstByMailTypeOrderByIdDesc(mailType)

            MailStatusItem(
                mailType = mailType.name,
                status = lastMail?.status,
                queuedAt = lastMail?.createdAt,
                sentAt = lastMail?.sentAt,
                lastError = lastMail?.lastError,
            )
        }

        return MailStatusListResponse(mailStatus = mailStatus)
    }

    @Transactional
    fun updateMailRecipients(settings: MailRecipientsRequest) {
        val recipients = settings.mailRecipients.flatMap { mailRecipient ->
            mailRecipient.recipients.flatMap { (updatedRecipientType, updatedRecipients) ->
                updatedRecipients
                    .filter { it.trim().isNotBlank() }
                    .map { updatedRecipient ->
                        MailRecipientEntity(
                            mailType = MailType.valueOf(mailRecipient.mailType),
                            recipientType = RecipientType.valueOf(updatedRecipientType.name.uppercase()),
                            address = updatedRecipient,
                        )
                    }
            }
        }

        mailRecipientRepository.deleteAll()
        mailRecipientRepository.saveAll(recipients)
        log.info("Updated mail recipients ({} entries across {} mail type(s))", recipients.size, settings.mailRecipients.size)
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
    fun updateStaticValue(staticValueId: Long, item: StaticValueRequest): StaticValueResponse {
        val entity = staticValueRepository.findByIdOrNull(staticValueId)
            ?: throw NotFoundException("Statischer Wert mit ID $staticValueId nicht gefunden")
        val amount = item.amount ?: throw BusinessRuleException("Betrag ist erforderlich!")

        val today = LocalDate.now()

        if (entity.validFrom == today) {
            entity.amount = amount
            val savedEntity = staticValueRepository.save(entity)
            log.info("Updated static value {} ({}) to {}", staticValueId, entity.type, amount)
            return mapStaticValue(savedEntity)
        }

        entity.validTo = today.minusDays(1)
        staticValueRepository.save(entity)

        val historizedEntity = StaticValueEntity(
            validFrom = today,
            validTo = FICTIVE_END_DATE,
            type = entity.type,
            amount = amount,
        ).apply {
            countAdults = entity.countAdults
            countChildren = entity.countChildren
            age = entity.age
        }

        val savedEntity = staticValueRepository.save(historizedEntity)
        log.info("Updated static value {} ({}) to {} (historized as new entry {})", staticValueId, entity.type, amount, savedEntity.id)
        return mapStaticValue(savedEntity)
    }

    private fun isCurrentlyValid(entity: StaticValueEntity, today: LocalDate): Boolean = !today.isBefore(entity.validFrom) && !today.isAfter(entity.validTo)

    private fun mapStaticValue(entity: StaticValueEntity): StaticValueResponse = StaticValueResponse(
        id = entity.id,
        type = entity.type.name,
        validFrom = entity.validFrom,
        validTo = entity.validTo,
        amount = entity.amount,
        countAdults = entity.countAdults,
        countChildren = entity.countChildren,
        age = entity.age,
    )
}
