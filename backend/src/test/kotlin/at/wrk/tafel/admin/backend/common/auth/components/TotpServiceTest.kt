package at.wrk.tafel.admin.backend.common.auth.components

import org.assertj.core.api.Assertions.assertThat
import org.junit.jupiter.api.Test
import java.time.Clock
import java.time.Instant
import java.time.ZoneOffset

class TotpServiceTest {

    // "12345678901234567890", the ASCII secret RFC 6238's test vectors use, in Base32
    private val rfcSecret = "GEZDGNBVGY3TQOJQGEZDGNBVGY3TQOJQ"

    private fun serviceAt(epochSecond: Long) = TotpService(Clock.fixed(Instant.ofEpochSecond(epochSecond), ZoneOffset.UTC))

    // The 8-digit values in RFC 6238 appendix B end in these six digits, which is what a 6-digit code is.
    @Test
    fun `computes the codes of the RFC 6238 test vectors`() {
        val vectors = mapOf(
            59L to "287082",
            1111111109L to "081804",
            1111111111L to "050471",
            1234567890L to "005924",
            2000000000L to "279037",
            20000000000L to "353130",
        )

        vectors.forEach { (time, expected) ->
            val service = serviceAt(time)
            assertThat(service.codeAt(rfcSecret, time / TotpService.STEP_SECONDS)).describedAs("code at $time").isEqualTo(expected)
            assertThat(service.matchingStep(rfcSecret, expected)).describedAs("match at $time").isEqualTo(time / TotpService.STEP_SECONDS)
        }
    }

    @Test
    fun `accepts the step before and after the current one, but no further away`() {
        val now = 1111111109L
        val step = now / TotpService.STEP_SECONDS
        val service = serviceAt(now)

        assertThat(service.matchingStep(rfcSecret, service.codeAt(rfcSecret, step - 1))).isEqualTo(step - 1)
        assertThat(service.matchingStep(rfcSecret, service.codeAt(rfcSecret, step))).isEqualTo(step)
        assertThat(service.matchingStep(rfcSecret, service.codeAt(rfcSecret, step + 1))).isEqualTo(step + 1)
        assertThat(service.matchingStep(rfcSecret, service.codeAt(rfcSecret, step - 2))).isNull()
        assertThat(service.matchingStep(rfcSecret, service.codeAt(rfcSecret, step + 2))).isNull()
    }

    @Test
    fun `refuses a code that is wrong, malformed or empty`() {
        val service = serviceAt(59)

        assertThat(service.matchingStep(rfcSecret, "000000")).isNull()
        assertThat(service.matchingStep(rfcSecret, "28708")).isNull()
        assertThat(service.matchingStep(rfcSecret, "2870820")).isNull()
        assertThat(service.matchingStep(rfcSecret, "28708a")).isNull()
        assertThat(service.matchingStep(rfcSecret, "")).isNull()
        assertThat(service.matchingStep(rfcSecret, "２８７０８２")).describedAs("non-ASCII digits").isNull()
    }

    @Test
    fun `ignores the space an authenticator app puts in the middle of a code`() {
        assertThat(serviceAt(59).matchingStep(rfcSecret, "287 082")).isEqualTo(1L)
        assertThat(serviceAt(59).matchingStep(rfcSecret, " 287082 ")).isEqualTo(1L)
    }

    @Test
    fun `refuses everything for a secret that is not Base32`() {
        assertThat(serviceAt(59).matchingStep("not base32!", "287082")).isNull()
    }

    @Test
    fun `generates a fresh Base32 secret of 160 bits every time`() {
        val service = serviceAt(59)

        val first = service.generateSecret()
        val second = service.generateSecret()

        assertThat(first).hasSize(32).matches("[A-Z2-7]+")
        assertThat(first).isNotEqualTo(second)
        // a generated secret works: the code computed from it is accepted
        assertThat(service.matchingStep(first, service.codeAt(first, 1))).isEqualTo(1L)
    }

    @Test
    fun `builds the otpauth address an authenticator app reads from the QR code`() {
        val uri = serviceAt(59).otpauthUri(issuer = "Tafel Wien", account = "max.mustermann", secret = "ABCDEFGH")

        assertThat(uri).isEqualTo(
            "otpauth://totp/Tafel%20Wien:max.mustermann?secret=ABCDEFGH&issuer=Tafel%20Wien&algorithm=SHA1&digits=6&period=30",
        )
    }

    @Test
    fun `escapes what would end the address early`() {
        val uri = serviceAt(59).otpauthUri(issuer = "A&B", account = "m@x y", secret = "ABCDEFGH")

        assertThat(uri).startsWith("otpauth://totp/A%26B:m%40x%20y?secret=ABCDEFGH&issuer=A%26B&")
    }
}
