package at.wrk.tafel.admin.backend.common.retention

import org.assertj.core.api.Assertions.assertThat
import org.junit.jupiter.api.Test
import java.time.Duration
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

    @Test
    fun `formats a plain minutes duration`() {
        assertThat(RetentionPeriodFormatter.format(Duration.ofMinutes(15))).isEqualTo("15 Minuten")
    }

    @Test
    fun `formats a mixed minutes-and-seconds duration`() {
        assertThat(RetentionPeriodFormatter.format(Duration.ofSeconds(90))).isEqualTo("1 Minuten 30 Sekunden")
    }

    @Test
    fun `formats a seconds-only duration`() {
        assertThat(RetentionPeriodFormatter.format(Duration.ofSeconds(45))).isEqualTo("45 Sekunden")
    }

    @Test
    fun `falls back to zero seconds for a zero duration`() {
        assertThat(RetentionPeriodFormatter.format(Duration.ZERO)).isEqualTo("0 Sekunden")
    }
}
