package at.wrk.tafel.admin.backend.modules.reporting

import at.wrk.tafel.admin.backend.modules.reporting.internal.StatisticsService
import org.springframework.security.access.prepost.PreAuthorize
import org.springframework.web.bind.annotation.GetMapping
import org.springframework.web.bind.annotation.RequestMapping
import org.springframework.web.bind.annotation.RestController
import java.time.LocalDateTime

@RestController
@RequestMapping("/api/statistics")
@PreAuthorize("hasAuthority('STATISTICS')")
class ReportingController(
    private val statisticsService: StatisticsService
) {

    @GetMapping("/settings")
    fun getSettings(): StatisticsSettings {
        return statisticsService.getSettings()
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
