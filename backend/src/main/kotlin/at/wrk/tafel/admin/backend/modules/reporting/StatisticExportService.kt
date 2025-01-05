package at.wrk.tafel.admin.backend.modules.reporting

import at.wrk.tafel.admin.backend.database.model.distribution.DistributionStatisticEntity
import at.wrk.tafel.admin.backend.modules.reporting.internal.statistic_exporter.StatisticExporter
import org.apache.commons.csv.CSVFormat
import org.apache.commons.csv.CSVPrinter
import org.springframework.stereotype.Service
import java.io.ByteArrayOutputStream
import java.io.OutputStreamWriter
import java.nio.charset.StandardCharsets

@Service
class StatisticExportService(
    private val statisticExporter: List<StatisticExporter>
) {

    companion object {
        private val CSV_FORMAT = CSVFormat.Builder.create().setDelimiter(";").build()
    }

    fun exportStatisticFiles(statistic: DistributionStatisticEntity): List<StatisticExportFile> {
        val statisticExports = statisticExporter.associate {
            "${it.getName()}.csv" to writeCsv(it.getRows(statistic))
        }

        return statisticExports.map {
            StatisticExportFile(
                name = it.key,
                content = it.value
            )
        }
    }

    private fun writeCsv(rows: List<List<String>>): ByteArray {
        val byteArrayOutputStream = ByteArrayOutputStream()

        OutputStreamWriter(byteArrayOutputStream, StandardCharsets.UTF_8).use { writer ->
            CSVPrinter(writer, CSV_FORMAT).use { csvPrinter ->
                rows.forEach { row ->
                    csvPrinter.printRecord(row)
                }
            }
        }

        return byteArrayOutputStream.toByteArray()
    }

}
