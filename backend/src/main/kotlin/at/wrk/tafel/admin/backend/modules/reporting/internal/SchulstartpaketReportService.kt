package at.wrk.tafel.admin.backend.modules.reporting.internal

import at.wrk.tafel.admin.backend.common.ExcludeFromTestCoverage
import at.wrk.tafel.admin.backend.common.csv.CsvUtil
import at.wrk.tafel.admin.backend.database.model.household.HouseholdEntity
import at.wrk.tafel.admin.backend.database.model.household.HouseholdRepository
import at.wrk.tafel.admin.backend.database.model.staticdata.StaticValueRepository
import at.wrk.tafel.admin.backend.database.model.staticdata.StaticValueType
import org.springframework.stereotype.Service
import java.time.LocalDate
import java.time.format.DateTimeFormatter
import java.time.temporal.ChronoUnit

@Service
class SchulstartpaketReportService(
    private val householdRepository: HouseholdRepository,
    private val staticValueRepository: StaticValueRepository,
) {
    companion object {
        private val DATE_FORMATTER = DateTimeFormatter.ofPattern("dd.MM.yyyy")
    }

    fun generateCsv(): SchulstartpaketReportCsvResult {
        val today = LocalDate.now()
        val rows = getReportRows(today)

        val csvRows: List<List<String>> = listOf(
            listOf("Haushalt", "Vorname", "Nachname", "Alter"),
        ) + rows.map { listOf(it.householdId.toString(), it.firstname, it.lastname, it.age.toString()) }

        return SchulstartpaketReportCsvResult(
            filename = "schulstartpakete_${DATE_FORMATTER.format(today)}.csv",
            bytes = CsvUtil.writeRowsToByteArray(csvRows),
        )
    }

    /**
     * Mirrors the ad-hoc SQL this report replaces: every additional (non-main) household member
     * of a currently valid household whose age falls in the configured min/max range, one row per
     * person, ordered by the household's business number.
     */
    private fun getReportRows(today: LocalDate): List<SchulstartpaketReportRow> {
        val ageMin = requireAgeThreshold(StaticValueType.SCHULSTARTPAKET_AGE_MIN, today)
        val ageMax = requireAgeThreshold(StaticValueType.SCHULSTARTPAKET_AGE_MAX, today)

        val households = householdRepository.findAll(HouseholdEntity.Specs.validHousehold())

        return households
            .flatMap { household -> rowsForHousehold(household, ageMin, ageMax, today) }
            .sortedBy { it.householdId }
    }

    private fun rowsForHousehold(
        household: HouseholdEntity,
        ageMin: Int,
        ageMax: Int,
        today: LocalDate,
    ): List<SchulstartpaketReportRow> = household.additionalPersons().mapNotNull { person ->
        val birthDate = person.birthDate ?: return@mapNotNull null
        val age = ChronoUnit.YEARS.between(birthDate, today).toInt()
        if (age !in ageMin..ageMax) {
            return@mapNotNull null
        }

        SchulstartpaketReportRow(
            householdId = household.householdId!!,
            firstname = person.firstname.orEmpty(),
            lastname = person.lastname.orEmpty(),
            age = age,
        )
    }

    private fun requireAgeThreshold(type: StaticValueType, today: LocalDate): Int =
        staticValueRepository.findSingleValueOfType(type, today)?.age
            ?: throw IllegalStateException("Kein gültiger Wert für $type konfiguriert")
}

data class SchulstartpaketReportRow(
    val householdId: Long,
    val firstname: String,
    val lastname: String,
    val age: Int,
)

@ExcludeFromTestCoverage
data class SchulstartpaketReportCsvResult(
    val filename: String,
    val bytes: ByteArray,
) {
    override fun equals(other: Any?): Boolean {
        if (this === other) return true
        if (javaClass != other?.javaClass) return false

        other as SchulstartpaketReportCsvResult

        if (filename != other.filename) return false
        return bytes.contentEquals(other.bytes)
    }

    override fun hashCode(): Int {
        var result = filename.hashCode()
        result = 31 * result + bytes.contentHashCode()
        return result
    }
}
