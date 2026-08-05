package at.wrk.tafel.admin.backend.common

import org.assertj.core.api.Assertions.assertThat
import org.junit.jupiter.api.Test

class LogSanitizerTest {

    @Test
    fun `strips CR and LF so a value cannot forge a second log line`() {
        val result = sanitizeForLog("legit-value\r\nWARN fake-forged-line")

        assertThat(result).isEqualTo("legit-value__WARN fake-forged-line")
        assertThat(result).doesNotContain("\r", "\n")
    }

    @Test
    fun `leaves an ordinary value untouched`() {
        assertThat(sanitizeForLog("/api/food-collections/routes/1/items")).isEqualTo("/api/food-collections/routes/1/items")
    }

    @Test
    fun `maps null to a placeholder`() {
        assertThat(sanitizeForLog(null)).isEqualTo("?")
    }
}
