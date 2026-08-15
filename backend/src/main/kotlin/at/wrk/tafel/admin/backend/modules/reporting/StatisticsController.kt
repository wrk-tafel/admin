package at.wrk.tafel.admin.backend.modules.reporting

import at.wrk.tafel.admin.backend.common.api.PagedResponse
import at.wrk.tafel.admin.backend.modules.reporting.internal.StatisticsCsvResult
import at.wrk.tafel.admin.backend.modules.reporting.internal.StatisticsService
import org.springframework.core.io.InputStreamResource
import org.springframework.http.HttpHeaders
import org.springframework.http.MediaType
import org.springframework.http.ResponseEntity
import org.springframework.security.access.prepost.PreAuthorize
import org.springframework.web.bind.annotation.GetMapping
import org.springframework.web.bind.annotation.RequestMapping
import org.springframework.web.bind.annotation.RequestParam
import org.springframework.web.bind.annotation.RestController
import java.io.ByteArrayInputStream
import java.time.LocalDate
import java.time.LocalDateTime

@RestController
@RequestMapping("/api/statistics")
@PreAuthorize("hasAuthority('STATISTICS')")
class StatisticsController(
    private val statisticsService: StatisticsService,
) {

    @GetMapping("/settings")
    fun getSettings(): StatisticsSettingsResponse = statisticsService.getSettings()

    @GetMapping("/data")
    fun getData(
        @RequestParam fromDate: LocalDate,
        @RequestParam toDate: LocalDate,
    ): StatisticsResponse = statisticsService.getData(fromDate, toDate)

    @GetMapping("/generate-csv", produces = [MediaType.TEXT_PLAIN_VALUE])
    fun generateCsv(
        @RequestParam fromDate: LocalDate,
        @RequestParam toDate: LocalDate,
    ): ResponseEntity<InputStreamResource> {
        val csvResult = statisticsService.generateCsv(fromDate, toDate)
        return csvResult.toResponseEntity()
    }

    /**
     * The children of currently entitled households within an age range ("Auswertung Kinder") -
     * a generic count that several purposes read, ordering school starter packages among them.
     *
     * [referenceDate] is the date the age is measured on, defaulting to today - the "Stichtag" the
     * frontend offers, since such an order is placed weeks before the day it is meant for.
     */
    @GetMapping("/children")
    fun getChildrenData(
        @RequestParam ageMin: Int,
        @RequestParam ageMax: Int,
        @RequestParam page: Int? = null,
        @RequestParam pageSize: Int? = null,
        @RequestParam referenceDate: LocalDate? = null,
    ): PagedResponse<ChildItem> = statisticsService.getChildrenData(ageMin, ageMax, page, pageSize, referenceDate)

    @GetMapping("/children/age-distribution")
    fun getChildrenAgeDistribution(
        @RequestParam ageMin: Int,
        @RequestParam ageMax: Int,
        @RequestParam referenceDate: LocalDate? = null,
    ): ChildrenAgeDistributionListResponse = statisticsService.getChildrenAgeDistribution(ageMin, ageMax, referenceDate)

    @GetMapping("/generate-children-csv", produces = [MediaType.TEXT_PLAIN_VALUE])
    fun generateChildrenCsv(
        @RequestParam ageMin: Int,
        @RequestParam ageMax: Int,
        @RequestParam referenceDate: LocalDate? = null,
    ): ResponseEntity<InputStreamResource> {
        val csvResult = statisticsService.generateChildrenCsv(ageMin, ageMax, referenceDate)
        return csvResult.toResponseEntity()
    }

    private fun StatisticsCsvResult.toResponseEntity(): ResponseEntity<InputStreamResource> {
        val headers = HttpHeaders()
        headers.add(
            HttpHeaders.CONTENT_DISPOSITION,
            "inline; filename=$filename",
        )

        return ResponseEntity
            .ok()
            .headers(headers)
            .contentType(MediaType.TEXT_PLAIN)
            .body(InputStreamResource(ByteArrayInputStream(bytes)))
    }
}

data class StatisticsSettingsResponse(
    val availableYears: List<Int>,
    val distributions: List<StatisticsDistribution>,
)

data class StatisticsDistribution(
    val startDate: LocalDateTime,
    val endDate: LocalDateTime,
)

data class StatisticsResponse(
    val beneficiaryCustomers: StatisticsDetail,
    val beneficiaryPersons: StatisticsDetail,
    val beneficiaryCustomersWithChildren: StatisticsDetail,
    val singleParentHouseholds: StatisticsDetail,
    val sheltersCount: StatisticsDetail,
    val sheltersAverage: StatisticsDetail,
    val sheltersPersonsCount: StatisticsDetail,
    val shopsCount: StatisticsDetail,
    val shopItemsTotal: StatisticsDetail,
    val shopItemsAverage: StatisticsDetail,
)

/**
 * One key figure of the general statistics: the headline both as the string it is displayed as
 * ([title], already formatted for de-AT) and as the plain number behind it ([value]), plus the
 * course over the period's distributions ([labels]/[dataPoints]).
 *
 * [value] is what the frontend compares two periods with - reading the delta back out of the
 * formatted [title] would mean parsing thousands separators and the unit out of it again. [unit] is
 * the unit that same number is measured in (`kg` for the collected amounts, `null` for a plain
 * count), so a value the frontend formats itself - the min/max of the chart, a difference between
 * two periods - can carry it too.
 */
data class StatisticsDetail(
    val title: String,
    val subTitle: String,
    val value: Double,
    val unit: String? = null,
    val labels: List<String>,
    val dataPoints: List<Number>,
)

data class ChildItem(
    val householdId: Long,
    val firstname: String,
    val lastname: String,
    val age: Int,
)

data class ChildrenAgeDistributionListResponse(
    val items: List<ChildAgeCountItem>,
)

data class ChildAgeCountItem(
    val age: Int,
    val count: Int,
)
