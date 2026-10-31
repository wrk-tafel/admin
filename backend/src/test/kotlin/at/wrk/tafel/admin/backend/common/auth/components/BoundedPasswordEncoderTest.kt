package at.wrk.tafel.admin.backend.common.auth.components

import io.mockk.every
import io.mockk.mockk
import io.mockk.verify
import org.assertj.core.api.Assertions.assertThat
import org.assertj.core.api.Assertions.assertThatThrownBy
import org.junit.jupiter.api.Test
import org.springframework.http.HttpHeaders
import org.springframework.http.HttpStatus
import org.springframework.security.crypto.password.PasswordEncoder
import java.util.concurrent.CountDownLatch
import java.util.concurrent.Executors
import java.util.concurrent.TimeUnit

class BoundedPasswordEncoderTest {

    private val delegate = mockk<PasswordEncoder>()

    @Test
    fun `encode and matches go to the delegate`() {
        every { delegate.encode("pwd") } returns "hash"
        every { delegate.matches("pwd", "hash") } returns true
        every { delegate.upgradeEncoding("hash") } returns true
        val encoder = BoundedPasswordEncoder(delegate, 1, 1)

        assertThat(encoder.encode("pwd")).isEqualTo("hash")
        assertThat(encoder.matches("pwd", "hash")).isTrue
        assertThat(encoder.upgradeEncoding("hash")).isTrue
    }

    @Test
    fun `a hash that finds every slot taken for the whole wait is answered with 503 and Retry-After`() {
        val started = CountDownLatch(1)
        val release = CountDownLatch(1)
        every { delegate.matches("slow", "hash") } answers {
            started.countDown()
            release.await(10, TimeUnit.SECONDS)
            true
        }
        val encoder = BoundedPasswordEncoder(delegate, 1, 1)
        val executor = Executors.newSingleThreadExecutor()
        try {
            val slow = executor.submit<Boolean> { encoder.matches("slow", "hash") }
            assertThat(started.await(5, TimeUnit.SECONDS)).isTrue

            assertThatThrownBy { encoder.matches("pwd", "hash") }
                .isInstanceOfSatisfying(PasswordHashingBusyException::class.java) {
                    assertThat(it.statusCode).isEqualTo(HttpStatus.SERVICE_UNAVAILABLE)
                    assertThat(it.headers.getFirst(HttpHeaders.RETRY_AFTER)).isEqualTo("1")
                }

            release.countDown()
            assertThat(slow.get(5, TimeUnit.SECONDS)).isTrue
        } finally {
            release.countDown()
            executor.shutdownNow()
        }
        verify(exactly = 0) { delegate.matches("pwd", any()) }
    }

    @Test
    fun `upgradeEncoding takes no slot`() {
        val started = CountDownLatch(1)
        val release = CountDownLatch(1)
        every { delegate.encode("slow") } answers {
            started.countDown()
            release.await(10, TimeUnit.SECONDS)
            "hash"
        }
        every { delegate.upgradeEncoding("hash") } returns false
        val encoder = BoundedPasswordEncoder(delegate, 1, 1)
        val executor = Executors.newSingleThreadExecutor()
        try {
            executor.submit<String?> { encoder.encode("slow") }
            assertThat(started.await(5, TimeUnit.SECONDS)).isTrue

            assertThat(encoder.upgradeEncoding("hash")).isFalse
        } finally {
            release.countDown()
            executor.shutdownNow()
        }
    }

    @Test
    fun `a failing hash gives its slot back`() {
        every { delegate.encode("boom") } throws IllegalStateException("boom")
        every { delegate.encode("pwd") } returns "hash"
        val encoder = BoundedPasswordEncoder(delegate, 1, 1)

        assertThatThrownBy { encoder.encode("boom") }.isInstanceOf(IllegalStateException::class.java)

        assertThat(encoder.encode("pwd")).isEqualTo("hash")
    }
}
