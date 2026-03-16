package at.wrk.tafel.admin.backend.modules.reporting

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
    private val statisticsService: StatisticsService
) {

    @GetMapping("/settings")
    fun getSettings(): StatisticsSettings {
        return statisticsService.getSettings()
    }

    @GetMapping("/data")
    fun getData(
        @RequestParam fromDate: LocalDate,
        @RequestParam toDate: LocalDate,
    ): StatisticsData {
        return statisticsService.getData(fromDate, toDate)
    }

    @GetMapping("/generate-csv", produces = [MediaType.TEXT_PLAIN_VALUE])
    fun generateCsv(
        @RequestParam fromDate: LocalDate,
        @RequestParam toDate: LocalDate,
    ): ResponseEntity<InputStreamResource> {
        val csvResult = statisticsService.generateCsv(fromDate, toDate)
        val headers = HttpHeaders()
        headers.add(
            HttpHeaders.CONTENT_DISPOSITION,
            "inline; filename=${csvResult.filename}"
        )

        return ResponseEntity
            .ok()
            .headers(headers)
            .contentType(MediaType.TEXT_PLAIN)
            .body(InputStreamResource(ByteArrayInputStream(csvResult.bytes)))
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
    val sheltersCount: StatisticsDetailData,
    val sheltersAverage: StatisticsDetailData,
)

data class StatisticsDetailData(
    val title: String,
    val subTitle: String,
    val labels: List<String>,
    val dataPoints: List<Number>,
)
