package at.wrk.tafel.admin.backend.modules.reporting

import at.wrk.tafel.admin.backend.common.ExcludeFromTestCoverage

@ExcludeFromTestCoverage
data class StatisticExport(
    val name: String,
    val rows: List<List<String>>
)
