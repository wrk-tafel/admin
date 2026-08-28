package at.wrk.tafel.admin.backend.common.retention

import org.assertj.core.api.Assertions.assertThat
import org.junit.jupiter.api.Test
import java.time.Period

class RetentionPeriodFormatterTest {

    @Test
    fun `formats a plain years period`() {
        assertThat(RetentionPeriodFormatter.format(Period.ofYears(7))).isEqualTo("7 Jahren")
    }

    @Test
    fun `formats a mixed years-and-months period`() {
        assertThat(RetentionPeriodFormatter.format(Period.of(1, 6, 0))).isEqualTo("1 Jahren 6 Monaten")
    }

    @Test
    fun `formats a days-only period`() {
        assertThat(RetentionPeriodFormatter.format(Period.ofDays(730))).isEqualTo("730 Tagen")
    }

    @Test
    fun `falls back to zero days for a zero period`() {
        assertThat(RetentionPeriodFormatter.format(Period.ZERO)).isEqualTo("0 Tagen")
    }
}
