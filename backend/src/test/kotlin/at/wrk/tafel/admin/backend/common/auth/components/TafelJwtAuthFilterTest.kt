package at.wrk.tafel.admin.backend.common.auth.components

import io.mockk.every
import io.mockk.impl.annotations.InjectMockKs
import io.mockk.impl.annotations.RelaxedMockK
import io.mockk.junit5.MockKExtension
import jakarta.servlet.http.HttpServletRequest
import org.assertj.core.api.Assertions.assertThat
import org.junit.jupiter.api.Test
import org.junit.jupiter.api.extension.ExtendWith
import org.springframework.security.authentication.AuthenticationManager
import org.springframework.security.web.authentication.AuthenticationConverter

@ExtendWith(MockKExtension::class)
internal class TafelJwtAuthFilterTest {

    @RelaxedMockK
    private lateinit var authenticationManager: AuthenticationManager

    @RelaxedMockK
    private lateinit var authenticationConverter: AuthenticationConverter

    @RelaxedMockK
    private lateinit var request: HttpServletRequest

    @InjectMockKs
    private lateinit var filter: TafelJwtAuthFilter

    @Test
    fun `shouldNotFilter when calling static resources`() {
        every { request.requestURI } returns "/#/test"

        val result = filter.shouldNotFilter(request)

        assertThat(result).isTrue
    }

    @Test
    fun `shouldNotFilter when calling the api`() {
        every { request.requestURI } returns "/api/test"

        val result = filter.shouldNotFilter(request)

        assertThat(result).isFalse
    }

}
