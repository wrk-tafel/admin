package at.wrk.tafel.admin.backend.modules.reporting

import at.wrk.tafel.admin.backend.common.ExcludeFromTestCoverage
import at.wrk.tafel.admin.backend.database.model.distribution.DistributionStatisticEntity
import at.wrk.tafel.admin.backend.modules.reporting.internal.statistic_exporter.StatisticExporter
import org.apache.commons.csv.CSVFormat
import org.apache.commons.csv.CSVPrinter
import org.springframework.stereotype.Service
import java.io.ByteArrayOutputStream
import java.io.OutputStreamWriter
import java.nio.charset.StandardCharsets
import java.util.zip.ZipEntry
import java.util.zip.ZipOutputStream

@Service
class StatisticExportService(
    private val statisticExporter: List<StatisticExporter>
) {

    companion object {
        private val CSV_FORMAT = CSVFormat.Builder.create().setDelimiter(";").build()
        private const val ZIPFILE_NAME = "statistik.zip"
    }

    fun exportStatisticZipFile(statistic: DistributionStatisticEntity): StatisticZipFile {
        val statisticExports = statisticExporter.associate {
            "${it.getName()}.csv" to writeCsv(it.getRows(statistic))
        }

        val zipBytes = writeZip(statisticExports)
        return StatisticZipFile(
            filename = ZIPFILE_NAME,
            content = zipBytes
        )
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

    private fun writeZip(contentMap: Map<String, ByteArray>): ByteArray {
        val byteArrayOutputStream = ByteArrayOutputStream()

        ZipOutputStream(byteArrayOutputStream).use { zipOutputStream ->
            contentMap.forEach { (fileName, content) ->
                val zipEntry = ZipEntry(fileName)
                zipOutputStream.putNextEntry(zipEntry)

                zipOutputStream.write(content)

                zipOutputStream.closeEntry()
            }
        }

        return byteArrayOutputStream.toByteArray()
    }

}

@ExcludeFromTestCoverage
data class StatisticZipFile(
    val filename: String,
    val content: ByteArray
) {
    override fun equals(other: Any?): Boolean {
        if (this === other) return true
        if (javaClass != other?.javaClass) return false

        other as StatisticZipFile

        if (filename != other.filename) return false
        if (!content.contentEquals(other.content)) return false

        return true
    }

    override fun hashCode(): Int {
        var result = filename.hashCode()
        result = 31 * result + content.contentHashCode()
        return result
    }
}
