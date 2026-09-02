package at.wrk.tafel.admin.backend.common.csv

import org.assertj.core.api.Assertions.assertThat
import org.junit.jupiter.api.Test
import java.nio.charset.StandardCharsets

class CsvUtilTest {

    // Unwraps CSVPrinter's own quoting (added whenever a field contains the delimiter, a quote, or
    // a control character like the tab/CR trigger chars below) so assertions can compare against
    // the sanitized value itself, regardless of whether the printer decided to quote the field.
    private fun writeSingleCell(value: String): String {
        val bytes = CsvUtil.writeRowsToByteArray(listOf(listOf(value)))
        val line = String(bytes, StandardCharsets.UTF_8).removeSuffix("\r\n").removeSuffix("\n")
        return if (line.startsWith("\"") && line.endsWith("\"")) {
            line.substring(1, line.length - 1).replace("\"\"", "\"")
        } else {
            line
        }
    }

    @Test
    fun `prefixes a cell starting with an equals sign to neutralize a formula`() {
        assertThat(writeSingleCell("=HYPERLINK(https://evil.example)")).isEqualTo("'=HYPERLINK(https://evil.example)")
    }

    @Test
    fun `prefixes cells starting with plus, minus or at, the other spreadsheet formula triggers`() {
        assertThat(writeSingleCell("+1234")).isEqualTo("'+1234")
        assertThat(writeSingleCell("-1234")).isEqualTo("'-1234")
        assertThat(writeSingleCell("@SUM(1,2)")).isEqualTo("'@SUM(1,2)")
    }

    @Test
    fun `prefixes a cell starting with a tab or carriage return, which would otherwise smuggle a formula past a naive check`() {
        assertThat(writeSingleCell("\t=1+1")).isEqualTo("'\t=1+1")
        assertThat(writeSingleCell("\r=1+1")).isEqualTo("'\r=1+1")
    }

    @Test
    fun `leaves an ordinary value untouched`() {
        assertThat(writeSingleCell("Max Mustermann")).isEqualTo("Max Mustermann")
    }

    @Test
    fun `leaves an empty value unprefixed`() {
        assertThat(writeSingleCell("")).doesNotStartWith("'")
    }
}
