package at.wrk.tafel.admin.backend.common.retention

import org.assertj.core.api.Assertions.assertThat
import org.junit.jupiter.api.Test
import java.time.LocalDateTime
import java.time.Period

class RetentionWindowTest {

    private val now = LocalDateTime.of(2027, 3, 5, 9, 0)

    @Test
    fun `moves the retention cutoff forward by the warning`() {
        val cutoff = RetentionWindow.warnCutoff(true, Period.ofYears(1), Period.ofDays(30), now)

        assertThat(cutoff).isEqualTo(now.minusYears(1).plusDays(30))
    }

    @Test
    fun `never lies in the future`() {
        assertThat(RetentionWindow.warnCutoff(true, Period.ofYears(1), Period.ofYears(2), now)).isEqualTo(now)
    }

    @Test
    fun `a negative warning counts as none`() {
        assertThat(RetentionWindow.warnCutoff(true, Period.ofYears(1), Period.ofDays(-5), now)).isEqualTo(now.minusYears(1))
    }

    @Test
    fun `is null for a job that is switched off or has no retention time`() {
        assertThat(RetentionWindow.warnCutoff(false, Period.ofYears(1), Period.ofDays(30), now)).isNull()
        assertThat(RetentionWindow.warnCutoff(true, Period.ZERO, Period.ofDays(30), now)).isNull()
        assertThat(RetentionWindow.warnCutoff(true, Period.ofYears(-1), Period.ofDays(30), now)).isNull()
    }
}
