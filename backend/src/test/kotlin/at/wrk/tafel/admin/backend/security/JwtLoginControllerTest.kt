package at.wrk.tafel.admin.backend.security

import at.wrk.tafel.admin.backend.security.components.JwtTokenService
import at.wrk.tafel.admin.backend.security.model.JwtResponse
import io.mockk.every
import io.mockk.impl.annotations.RelaxedMockK
import io.mockk.junit5.MockKExtension
import org.assertj.core.api.Assertions.assertThat
import org.junit.jupiter.api.BeforeEach
import org.junit.jupiter.api.Test
import org.junit.jupiter.api.extension.ExtendWith
import org.springframework.http.HttpStatus
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken
import org.springframework.security.core.context.SecurityContextHolder
import org.springframework.security.core.context.SecurityContextImpl
import org.springframework.security.core.userdetails.User

@ExtendWith(MockKExtension::class)
class JwtLoginControllerTest {

    @RelaxedMockK
    private lateinit var jwtTokenService: JwtTokenService

    private lateinit var jwtLoginController: JwtLoginController

    @BeforeEach
    fun beforeEach() {
        jwtLoginController = JwtLoginController(jwtTokenService)
    }

    @Test
    fun `generateToken - no securityContext given`() {
        SecurityContextHolder.clearContext()

        val responseEntity = jwtLoginController.generateToken()

        assertThat(responseEntity.statusCodeValue).isEqualTo(HttpStatus.FORBIDDEN.value())
    }

    @Test
    fun `generateToken - securityContext given without principal`() {
        SecurityContextHolder.setContext(
            SecurityContextImpl(
                UsernamePasswordAuthenticationToken(null, null)
            )
        )

        val responseEntity = jwtLoginController.generateToken()

        assertThat(responseEntity.statusCodeValue).isEqualTo(HttpStatus.FORBIDDEN.value())
    }

    @Test
    fun `generateToken - securityContext given normal`() {
        every { jwtTokenService.generateToken(any(), any()) } returns "TOKEN"

        SecurityContextHolder.setContext(
            SecurityContextImpl(
                UsernamePasswordAuthenticationToken(
                    User("test-name", "no-pwd", listOf()), null
                )
            )
        )

        val responseEntity = jwtLoginController.generateToken()

        assertThat(responseEntity.statusCodeValue).isEqualTo(HttpStatus.OK.value())
        assertThat(responseEntity.body).isEqualTo(JwtResponse("TOKEN"))
    }

}
