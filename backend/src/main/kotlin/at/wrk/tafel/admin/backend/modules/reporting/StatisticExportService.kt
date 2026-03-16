package at.wrk.tafel.admin.backend.modules.reporting

import at.wrk.tafel.admin.backend.common.csv.CsvUtil
import at.wrk.tafel.admin.backend.database.model.distribution.DistributionStatisticEntity
import at.wrk.tafel.admin.backend.modules.reporting.internal.statistic_exporter.StatisticExporter
import org.springframework.stereotype.Service

@Service
class StatisticExportService(
    private val statisticExporter: List<StatisticExporter>
) {

    fun exportStatisticFiles(statistic: DistributionStatisticEntity): List<StatisticExportFile> {
        val statisticExports = statisticExporter.associate {
            "${it.getName()}.csv" to CsvUtil.writeRowsToByteArray(it.getRows(statistic))
        }

        return statisticExports.map {
            StatisticExportFile(
                name = it.key,
                content = it.value
            )
        }
    }

}
