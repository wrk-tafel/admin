package at.wrk.tafel.admin.backend.common.csv

import org.apache.commons.csv.CSVFormat
import org.apache.commons.csv.CSVPrinter
import java.io.ByteArrayOutputStream
import java.io.OutputStreamWriter
import java.nio.charset.StandardCharsets

object CsvUtil {

    private val CSV_FORMAT = CSVFormat.Builder.create().setDelimiter(";").get()

    fun writeRowsToByteArray(rows: List<List<String>>): ByteArray {
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
