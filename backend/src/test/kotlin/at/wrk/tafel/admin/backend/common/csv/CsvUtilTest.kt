package at.wrk.tafel.admin.backend.common.csv

import org.assertj.core.api.Assertions.assertThat
import org.junit.jupiter.api.Test
import java.nio.charset.StandardCharsets

class CsvUtilTest {

    private fun writeSingleCell(value: String): String {
        val bytes = CsvUtil.writeRowsToByteArray(listOf(listOf(value)))
        return String(bytes, StandardCharsets.UTF_8).trim()
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
    fun `leaves an ordinary value untouched`() {
        assertThat(writeSingleCell("Max Mustermann")).isEqualTo("Max Mustermann")
    }

    @Test
    fun `leaves an empty value unprefixed`() {
        assertThat(writeSingleCell("")).doesNotStartWith("'")
    }
}
