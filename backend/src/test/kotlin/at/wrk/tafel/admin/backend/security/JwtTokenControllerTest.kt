package at.wrk.tafel.admin.backend.security

import at.wrk.tafel.admin.backend.security.components.JwtTokenService
import at.wrk.tafel.admin.backend.security.model.JwtAuthenticationResponse
import at.wrk.tafel.admin.backend.security.model.TafelUser
import io.mockk.every
import io.mockk.impl.annotations.RelaxedMockK
import io.mockk.junit5.MockKExtension
import org.apache.catalina.realm.GenericPrincipal
import org.assertj.core.api.Assertions.assertThat
import org.junit.jupiter.api.BeforeEach
import org.junit.jupiter.api.Test
import org.junit.jupiter.api.extension.ExtendWith
import org.springframework.http.HttpStatus
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken
import org.springframework.security.core.context.SecurityContextHolder
import org.springframework.security.core.context.SecurityContextImpl
import javax.servlet.http.HttpServletRequest

@ExtendWith(MockKExtension::class)
class JwtTokenControllerTest {

    @RelaxedMockK
    private lateinit var request: HttpServletRequest

    @RelaxedMockK
    private lateinit var jwtTokenService: JwtTokenService

    private lateinit var controller: JwtTokenController

    @BeforeEach
    fun beforeEach() {
        controller = JwtTokenController(jwtTokenService)
    }

    @Test
    fun `generateToken - no securityContext given`() {
        SecurityContextHolder.clearContext()

        val responseEntity = controller.generateToken(request)

        assertThat(responseEntity.statusCodeValue).isEqualTo(HttpStatus.FORBIDDEN.value())
    }

    @Test
    fun `generateToken - securityContext given without principal`() {
        SecurityContextHolder.setContext(
            SecurityContextImpl(
                UsernamePasswordAuthenticationToken(null, null)
            )
        )

        val responseEntity = controller.generateToken(request)

        assertThat(responseEntity.statusCodeValue).isEqualTo(HttpStatus.FORBIDDEN.value())
    }

    @Test
    fun `generateToken - securityContext given normal`() {
        every { jwtTokenService.generateToken(any(), any()) } returns "TOKEN"

        SecurityContextHolder.setContext(
            SecurityContextImpl(
                UsernamePasswordAuthenticationToken(
                    TafelUser(
                        username = "test-name",
                        password = "no-pwd",
                        enabled = true,
                        id = 0,
                        personnelNumber = "0000",
                        firstname = "First",
                        lastname = "Last",
                        authorities = emptyList(),
                        passwordChangeRequired = false
                    ), null
                )
            )
        )

        val responseEntity = controller.generateToken(request)

        assertThat(responseEntity.statusCodeValue).isEqualTo(HttpStatus.OK.value())
        assertThat(responseEntity.body).isEqualTo(
            JwtAuthenticationResponse(
                token = "TOKEN",
                passwordChangeRequired = false
            )
        )
    }

    @Test
    fun `generateToken - passwordchange required`() {
        every { jwtTokenService.generateToken(any(), any()) } returns "TOKEN"

        SecurityContextHolder.setContext(
            SecurityContextImpl(
                UsernamePasswordAuthenticationToken(
                    TafelUser(
                        username = "test-name",
                        password = "no-pwd",
                        enabled = true,
                        id = 0,
                        personnelNumber = "0000",
                        firstname = "First",
                        lastname = "Last",
                        authorities = emptyList(),
                        passwordChangeRequired = true
                    ), null
                )
            )
        )

        val responseEntity = controller.generateToken(request)

        assertThat(responseEntity.statusCodeValue).isEqualTo(HttpStatus.OK.value())
        assertThat(responseEntity.body).isEqualTo(
            JwtAuthenticationResponse(
                token = "TOKEN",
                passwordChangeRequired = true
            )
        )
    }

    @Test
    fun `generateToken - securityContext given wrong principal`() {
        every { jwtTokenService.generateToken(any(), any()) } returns "TOKEN"

        SecurityContextHolder.setContext(
            SecurityContextImpl(
                UsernamePasswordAuthenticationToken(
                    GenericPrincipal("username", "pwd", emptyList()), null
                )
            )
        )

        val responseEntity = controller.generateToken(request)

        assertThat(responseEntity.statusCodeValue).isEqualTo(HttpStatus.FORBIDDEN.value())
    }

}
