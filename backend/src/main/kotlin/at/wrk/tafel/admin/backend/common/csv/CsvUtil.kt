package at.wrk.tafel.admin.backend.common.csv

import org.apache.commons.csv.CSVFormat
import org.apache.commons.csv.CSVPrinter
import java.io.ByteArrayOutputStream
import java.io.OutputStreamWriter
import java.nio.charset.StandardCharsets

object CsvUtil {

    private val CSV_FORMAT = CSVFormat.Builder.create().setDelimiter(";").get()

    // Characters Excel/Sheets/LibreOffice treat as a formula prefix - a cell starting with one of
    // these executes as a formula the moment the file is opened, rather than showing as the plain
    // text it actually is (CWE-1236). Several exported columns carry free text a data subject
    // supplied (e.g. a household member's name), so this cannot be assumed safe. Tab (0x09) and
    // carriage return (0x0D) are on the OWASP CSV Injection list alongside the four visible
    // characters: Excel strips leading whitespace/control characters before evaluating a cell, so
    // "\t=1+1" would otherwise bypass a check that only looked at the literal first character.
    private val FORMULA_TRIGGER_CHARS = charArrayOf('=', '+', '-', '@', '\t', '\r')

    fun writeRowsToByteArray(rows: List<List<String>>): ByteArray {
        val byteArrayOutputStream = ByteArrayOutputStream()

        OutputStreamWriter(byteArrayOutputStream, StandardCharsets.UTF_8).use { writer ->
            CSVPrinter(writer, CSV_FORMAT).use { csvPrinter ->
                rows.forEach { row ->
                    csvPrinter.printRecord(row.map { sanitizeCell(it) })
                }
            }
        }

        return byteArrayOutputStream.toByteArray()
    }

    /**
     * Prefixing with a single quote is the standard spreadsheet-formula-injection mitigation
     * (OWASP CSV Injection): every affected application then renders the cell as literal text
     * instead of evaluating it.
     */
    private fun sanitizeCell(value: String): String = if (value.isNotEmpty() && value[0] in FORMULA_TRIGGER_CHARS) {
        "'$value"
    } else {
        value
    }
}
