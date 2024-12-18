package at.wrk.tafel.admin.backend.config

import at.wrk.tafel.admin.backend.common.ExcludeFromTestCoverage
import org.springframework.boot.context.properties.ConfigurationProperties

@ConfigurationProperties(prefix = "tafeladmin")
@ExcludeFromTestCoverage
data class TafelAdminProperties(
    val mail: TafelAdminMailProperties? = null
)

@ExcludeFromTestCoverage
data class TafelAdminMailProperties(
    val from: String,
    val subjectPrefix: String? = null,
    val dailyreport: TafelAdminMailDailyReportProperties? = null
)

@ExcludeFromTestCoverage
data class TafelAdminMailDailyReportProperties(
    val to: List<String>? = emptyList(),
    val cc: List<String>? = emptyList(),
    val bcc: List<String>? = emptyList()
)
