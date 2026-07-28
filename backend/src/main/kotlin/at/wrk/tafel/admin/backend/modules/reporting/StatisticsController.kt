package at.wrk.tafel.admin.backend.modules.reporting

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
    fun getSettings(): StatisticsSettings = statisticsService.getSettings()

    @GetMapping("/data")
    fun getData(
        @RequestParam fromDate: LocalDate,
        @RequestParam toDate: LocalDate,
    ): StatisticsData = statisticsService.getData(fromDate, toDate)

    @GetMapping("/generate-csv", produces = [MediaType.TEXT_PLAIN_VALUE])
    fun generateCsv(
        @RequestParam fromDate: LocalDate,
        @RequestParam toDate: LocalDate,
    ): ResponseEntity<InputStreamResource> {
        val csvResult = statisticsService.generateCsv(fromDate, toDate)
        return csvResult.toResponseEntity()
    }

    @GetMapping("/school-starter-package")
    fun getSchoolStarterPackageData(
        @RequestParam ageMin: Int,
        @RequestParam ageMax: Int,
        @RequestParam page: Int? = null,
    ): SchoolStarterPackageSearchResult = statisticsService.getSchoolStarterPackageData(ageMin, ageMax, page)

    @GetMapping("/generate-school-starter-package-csv", produces = [MediaType.TEXT_PLAIN_VALUE])
    fun generateSchoolStarterPackageCsv(
        @RequestParam ageMin: Int,
        @RequestParam ageMax: Int,
    ): ResponseEntity<InputStreamResource> {
        val csvResult = statisticsService.generateSchoolStarterPackageCsv(ageMin, ageMax)
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

data class StatisticsSettings(
    val availableYears: List<Int>,
    val distributions: List<StatisticsDistribution>,
)

data class StatisticsDistribution(
    val startDate: LocalDateTime,
    val endDate: LocalDateTime,
)

data class StatisticsData(
    val beneficiaryCustomers: StatisticsDetailData,
    val beneficiaryPersons: StatisticsDetailData,
    val beneficiaryCustomersWithChildren: StatisticsDetailData,
    val singleParentHouseholds: StatisticsDetailData,
    val sheltersCount: StatisticsDetailData,
    val sheltersAverage: StatisticsDetailData,
    val sheltersPersonsCount: StatisticsDetailData,
    val shopsCount: StatisticsDetailData,
    val shopItemsTotal: StatisticsDetailData,
    val shopItemsAverage: StatisticsDetailData,
)

data class StatisticsDetailData(
    val title: String,
    val subTitle: String,
    val labels: List<String>,
    val dataPoints: List<Number>,
)

data class SchoolStarterPackageEntry(
    val householdId: Long,
    val firstname: String,
    val lastname: String,
    val age: Int,
)

data class SchoolStarterPackageSearchResult(
    val items: List<SchoolStarterPackageEntry>,
    val totalCount: Long,
    val currentPage: Int,
    val totalPages: Int,
    val pageSize: Int,
)
