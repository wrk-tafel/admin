package at.wrk.tafel.admin.backend.common.auth.components

import org.assertj.core.api.Assertions.assertThat
import org.junit.jupiter.api.Test

class TafelArgon2PasswordEncoderTest {

    private val encoder = TafelArgon2PasswordEncoder(16, 32, 1, 4096, 2)

    @Test
    fun `a hash with the configured parameters is not upgraded`() {
        val hash = encoder.encode("pwd")!!

        assertThat(encoder.upgradeEncoding(hash)).isFalse
    }

    @Test
    fun `a hash with weaker parameters is upgraded`() {
        val hash = TafelArgon2PasswordEncoder(16, 32, 1, 1024, 1).encode("pwd")!!

        assertThat(encoder.upgradeEncoding(hash)).isTrue
    }

    @Test
    fun `a hash with stronger memory is upgraded too`() {
        val hash = TafelArgon2PasswordEncoder(16, 32, 1, 8192, 2).encode("pwd")!!

        assertThat(encoder.upgradeEncoding(hash)).isTrue
    }

    @Test
    fun `a hash with more iterations is upgraded too`() {
        val hash = TafelArgon2PasswordEncoder(16, 32, 1, 4096, 3).encode("pwd")!!

        assertThat(encoder.upgradeEncoding(hash)).isTrue
    }

    @Test
    fun `a hash with more parallelism is upgraded too`() {
        val hash = TafelArgon2PasswordEncoder(16, 32, 2, 4096, 2).encode("pwd")!!

        assertThat(encoder.upgradeEncoding(hash)).isTrue
    }

    @Test
    fun `a hash with stronger parameters still verifies`() {
        val hash = TafelArgon2PasswordEncoder(16, 32, 1, 8192, 3).encode("pwd")!!

        assertThat(encoder.matches("pwd", hash)).isTrue
        assertThat(encoder.matches("wrong", hash)).isFalse
    }
}
