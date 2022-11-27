package at.wrk.tafel.admin.backend.security

import at.wrk.tafel.admin.backend.common.auth.JwtTokenController
import at.wrk.tafel.admin.backend.config.ApplicationProperties
import at.wrk.tafel.admin.backend.common.auth.components.JwtTokenService
import at.wrk.tafel.admin.backend.common.auth.model.JwtAuthenticationResponse
import at.wrk.tafel.admin.backend.common.auth.model.TafelUser
import io.mockk.every
import io.mockk.impl.annotations.RelaxedMockK
import io.mockk.junit5.MockKExtension
import io.mockk.verify
import org.apache.catalina.realm.GenericPrincipal
import org.assertj.core.api.Assertions.assertThat
import org.junit.jupiter.api.BeforeEach
import org.junit.jupiter.api.Test
import org.junit.jupiter.api.extension.ExtendWith
import org.springframework.http.HttpStatus
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken
import org.springframework.security.core.authority.SimpleGrantedAuthority
import org.springframework.security.core.context.SecurityContextHolder
import org.springframework.security.core.context.SecurityContextImpl
import javax.servlet.http.HttpServletRequest

@ExtendWith(MockKExtension::class)
class JwtTokenControllerTest {

    @RelaxedMockK
    private lateinit var request: HttpServletRequest

    @RelaxedMockK
    private lateinit var applicationProperties: ApplicationProperties

    @RelaxedMockK
    private lateinit var jwtTokenService: JwtTokenService

    private lateinit var controller: JwtTokenController
    private val EXPIRATIONTIME_DEFAULT: Int = 60
    private val EXPIRATIONTIME_PWDCHANGE: Int = 30

    @BeforeEach
    fun beforeEach() {
        every { applicationProperties.security.jwtToken.expirationTimeInSeconds } returns EXPIRATIONTIME_DEFAULT
        every { applicationProperties.security.jwtToken.expirationTimePwdChangeInSeconds } returns EXPIRATIONTIME_PWDCHANGE

        controller = JwtTokenController(jwtTokenService, applicationProperties)
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
        every { jwtTokenService.generateToken(any(), any(), any()) } returns "TOKEN"

        val user = TafelUser(
            username = "test-name",
            password = "no-pwd",
            enabled = true,
            id = 0,
            personnelNumber = "0000",
            firstname = "First",
            lastname = "Last",
            authorities = listOf(
                SimpleGrantedAuthority("AUTH1"),
                SimpleGrantedAuthority("AUTH2")
            ),
            passwordChangeRequired = false
        )
        SecurityContextHolder.setContext(
            SecurityContextImpl(
                UsernamePasswordAuthenticationToken(user, null)
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

        verify { jwtTokenService.generateToken(user.username, user.authorities, EXPIRATIONTIME_DEFAULT) }
    }

    @Test
    fun `generateToken - passwordchange required`() {
        every { jwtTokenService.generateToken(any(), any(), any()) } returns "TOKEN"

        val user = TafelUser(
            username = "test-name",
            password = "no-pwd",
            enabled = true,
            id = 0,
            personnelNumber = "0000",
            firstname = "First",
            lastname = "Last",
            authorities = emptyList(),
            passwordChangeRequired = true
        )
        SecurityContextHolder.setContext(
            SecurityContextImpl(
                UsernamePasswordAuthenticationToken(user, null)
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

        verify { jwtTokenService.generateToken(user.username, emptyList(), EXPIRATIONTIME_PWDCHANGE) }
    }

    @Test
    fun `generateToken - securityContext given wrong principal`() {
        every { jwtTokenService.generateToken(any(), any(), any()) } returns "TOKEN"

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
