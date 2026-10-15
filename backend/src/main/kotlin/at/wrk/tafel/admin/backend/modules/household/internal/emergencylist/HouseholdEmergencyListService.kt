package at.wrk.tafel.admin.backend.modules.household.internal.emergencylist

import at.wrk.tafel.admin.backend.common.pdf.PDFService
import at.wrk.tafel.admin.backend.database.common.audit.AuditLogWriter
import at.wrk.tafel.admin.backend.database.common.audit.AuditOperation
import at.wrk.tafel.admin.backend.database.common.audit.AuditScope
import at.wrk.tafel.admin.backend.database.model.household.HouseholdEntity
import at.wrk.tafel.admin.backend.database.model.household.HouseholdEntity.Specs.Companion.validHousehold
import at.wrk.tafel.admin.backend.database.model.household.HouseholdRepository
import at.wrk.tafel.admin.backend.modules.household.internal.HouseholdPdfResult
import org.apache.commons.io.IOUtils
import org.springframework.data.domain.Sort
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional
import org.springframework.util.MimeTypeUtils
import java.time.Clock
import java.time.LocalDate
import java.time.LocalDateTime
import java.time.format.DateTimeFormatter

/**
 * The "Notfallliste": every household that is entitled today, on paper, for the case that the
 * application cannot be reached at the start of a distribution. The distribution's own Kundenliste
 * is no substitute - it only lists the households already checked in.
 *
 * Locked households stay on the list, marked: who is turned away at the desk has to be known on
 * paper too. Expired households are left out, as they are not entitled.
 *
 * The list is the household register on paper, so every generation is recorded as one bulk read in
 * `audit_log` - which is why [generateEmergencyListPdf] is not read-only.
 */
@Service
class HouseholdEmergencyListService(
    private val householdRepository: HouseholdRepository,
    private val pdfService: PDFService,
    private val auditLogWriter: AuditLogWriter,
    private val clock: Clock,
) {
    companion object {
        private val DATE_FORMATTER = DateTimeFormatter.ofPattern("dd.MM.yyyy")
        private val DATE_TIME_FORMATTER = DateTimeFormatter.ofPattern("dd.MM.yyyy HH:mm")
        private val FILENAME_DATE_FORMATTER = DateTimeFormatter.ofPattern("yyyy-MM-dd")
        private const val STYLESHEET_PATH = "/pdf-templates/household-emergency-list/emergency-list.xsl"
    }

    @Transactional
    fun generateEmergencyListPdf(): HouseholdPdfResult {
        val households = householdRepository.findAll(validHousehold(), Sort.by("householdId"))
        val items = households.map { it.toEmergencyListItem() }

        auditLogWriter.record(
            AuditLogWriter.PendingEntry(
                entityType = AuditScope.HOUSEHOLD_EMERGENCY_LIST_ENTITY_TYPE,
                entityId = null,
                businessKey = "${items.size} Haushalte",
                operation = AuditOperation.READ,
                changedFields = emptyMap(),
            ),
        )

        val now = LocalDateTime.now(clock)
        val data = HouseholdEmergencyListPdfModel(
            logoContentType = MimeTypeUtils.IMAGE_PNG_VALUE,
            logoBytes = IOUtils.toByteArray(javaClass.getResourceAsStream("/assets/logo.png")),
            title = "Notfallliste",
            subtitle = "Bezugsberechtigte Kunden, Stand ${DATE_FORMATTER.format(now)}",
            generatedAt = DATE_TIME_FORMATTER.format(now),
            countHouseholds = items.size,
            countPersons = items.sumOf { it.countPersons },
            households = items,
        )

        val bytes = pdfService.generatePdf(data, STYLESHEET_PATH, "${items.size} households")
        return HouseholdPdfResult(
            filename = "notfallliste-${FILENAME_DATE_FORMATTER.format(now)}.pdf",
            bytes = bytes,
        )
    }

    private fun HouseholdEntity.toEmergencyListItem(): HouseholdEmergencyListItem {
        val mainPerson = mainPerson ?: persons.firstOrNull { it.isMainPerson }
        val name = listOfNotNull(mainPerson?.lastname, mainPerson?.firstname)
            .filter { it.isNotBlank() }
            .joinToString(" ")
            .ifBlank { "-" }

        return HouseholdEmergencyListItem(
            householdId = householdId,
            name = name,
            countPersons = 1 + additionalPersons().count { !it.excludeFromHousehold },
            validUntil = DATE_FORMATTER.format(validUntil),
            lockText = lockText(locked, lockedUntil),
        )
    }

    private fun lockText(locked: Boolean, lockedUntil: LocalDate?): String? = when {
        !locked -> null
        lockedUntil == null -> "gesperrt"
        else -> "gesperrt bis ${DATE_FORMATTER.format(lockedUntil)}"
    }
}
