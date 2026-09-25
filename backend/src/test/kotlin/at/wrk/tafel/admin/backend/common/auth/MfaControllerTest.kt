package at.wrk.tafel.admin.backend.common.auth

import at.wrk.tafel.admin.backend.common.auth.components.JwtTokenService
import at.wrk.tafel.admin.backend.common.auth.components.MfaService
import at.wrk.tafel.admin.backend.common.auth.components.MfaSetup
import at.wrk.tafel.admin.backend.common.auth.components.MfaStatus
import at.wrk.tafel.admin.backend.common.auth.components.TafelLoginFilter
import at.wrk.tafel.admin.backend.common.auth.components.TafelUserDetailsManager
import at.wrk.tafel.admin.backend.common.auth.model.MfaCodeRequest
import at.wrk.tafel.admin.backend.common.auth.model.MfaDisableRequest
import at.wrk.tafel.admin.backend.common.auth.model.MfaEnableRequest
import at.wrk.tafel.admin.backend.common.auth.model.MfaMethod
import at.wrk.tafel.admin.backend.common.auth.model.TafelJwtAuthentication
import at.wrk.tafel.admin.backend.config.properties.ApplicationProperties
import at.wrk.tafel.admin.backend.config.properties.TafelAdminProperties
import at.wrk.tafel.admin.backend.modules.base.exception.BusinessRuleException
import at.wrk.tafel.admin.backend.modules.base.exception.ConflictException
import at.wrk.tafel.admin.backend.modules.base.exception.TafelApiException
import at.wrk.tafel.admin.backend.security.testUser
import io.mockk.every
import io.mockk.mockk
import io.mockk.verify
import org.assertj.core.api.Assertions.assertThat
import org.junit.jupiter.api.AfterEach
import org.junit.jupiter.api.BeforeEach
import org.junit.jupiter.api.Test
import org.junit.jupiter.api.assertThrows
import org.springframework.http.HttpStatus
import org.springframework.mock.web.MockHttpServletRequest
import org.springframework.mock.web.MockHttpServletResponse
import org.springframework.security.core.context.SecurityContextHolder

class MfaControllerTest {

    private val mfaService = mockk<MfaService>(relaxed = true)
    private val userDetailsManager = mockk<TafelUserDetailsManager>(relaxed = true)
    private val jwtTokenService = mockk<JwtTokenService>(relaxed = true)
    private val applicationProperties = mockk<ApplicationProperties>(relaxed = true)
    private val tafelAdminProperties = TafelAdminProperties()

    private lateinit var controller: MfaController
    private val request = MockHttpServletRequest()
    private lateinit var response: MockHttpServletResponse

    @BeforeEach
    fun setup() {
        controller = MfaController(mfaService, userDetailsManager, jwtTokenService, applicationProperties, tafelAdminProperties)
        response = MockHttpServletResponse()
        every { userDetailsManager.loadUserByUsername("max") } returns testUser.copy(username = "max")
        every { applicationProperties.security.jwtToken.expirationTimeInSeconds } returns 3600
        every { applicationProperties.security.jwtToken.expirationTimePwdChangeInSeconds } returns 300
        every { jwtTokenService.generateToken(any(), any(), any()) } returns "FULL-TOKEN"
    }

    @AfterEach
    fun afterEach() {
        SecurityContextHolder.clearContext()
    }

    private fun signedIn(mfaPending: Boolean = false, mfaSetupRequired: Boolean = false) {
        SecurityContextHolder.getContext().authentication = TafelJwtAuthentication(
            tokenValue = "token",
            username = "max",
            authenticated = true,
            mfaPending = mfaPending,
            mfaSetupRequired = mfaSetupRequired,
        )
    }

    private fun code(value: String = "123456") = MfaCodeRequest(code = value)

    private fun enableRequest(value: String = "123456", currentCode: String? = null) = MfaEnableRequest(code = value, currentCode = currentCode)

    @Test
    fun `status and setup are answered for a completed session`() {
        signedIn()
        every { mfaService.getStatus("max") } returns
            MfaStatus(totpEnabled = true, emailEnabled = false, required = true, emailAvailable = true, emailAddress = "max@example.org")
        every { mfaService.startSetup("max") } returns MfaSetup(secret = "SECRET", otpauthUri = "otpauth://totp/x")

        val status = controller.getStatus()
        val setup = controller.setup()

        assertThat(status.totpEnabled).isTrue()
        assertThat(status.emailEnabled).isFalse()
        assertThat(status.required).isTrue()
        assertThat(status.emailAvailable).isTrue()
        assertThat(status.emailAddress).isEqualTo("max@example.org")
        assertThat(setup.secret).isEqualTo("SECRET")
        assertThat(setup.otpauthUri).isEqualTo("otpauth://totp/x")
    }

    // Whoever only knows the password must not be able to switch the second factor off or replace it.
    @Test
    fun `a session that still owes its code cannot read, set up, enable or disable anything`() {
        signedIn(mfaPending = true)

        assertThrows<TafelApiException> { controller.getStatus() }.also { assertThat(it.statusCode).isEqualTo(HttpStatus.FORBIDDEN) }
        assertThrows<TafelApiException> { controller.setup() }
        assertThrows<TafelApiException> { controller.enable(enableRequest(), request, response) }
        assertThrows<TafelApiException> { controller.setupEmail() }
        assertThrows<TafelApiException> { controller.enableEmail(enableRequest(), request, response) }
        assertThrows<TafelApiException> { controller.disable(MfaDisableRequest(MfaMethod.TOTP, "123456")) }

        verify(exactly = 0) { mfaService.startSetup(any()) }
        verify(exactly = 0) { mfaService.enable(any(), any(), any()) }
        verify(exactly = 0) { mfaService.startEmailSetup(any()) }
        verify(exactly = 0) { mfaService.enableEmail(any(), any(), any()) }
        verify(exactly = 0) { mfaService.disable(any(), any(), any()) }
    }

    @Test
    fun `a session that has to set a method up may do so`() {
        signedIn(mfaSetupRequired = true)
        every { mfaService.enable("max", "123456", null) } returns true

        controller.getStatus()
        controller.setup()
        controller.setupEmail()
        controller.enable(enableRequest(), request, response)

        verify(exactly = 1) { mfaService.startSetup("max") }
        verify(exactly = 1) { mfaService.startEmailSetup("max") }
        // and the answer is a session that has passed the second factor, so it is usable from here on
        verify(exactly = 1) { jwtTokenService.generateToken("max", 3600, true) }
    }

    @Test
    fun `enabling the app answers with a session that has passed the second factor`() {
        signedIn()
        every { mfaService.enable("max", "123456", null) } returns true

        val result = controller.enable(enableRequest(), request, response)

        assertThat(result.statusCode).isEqualTo(HttpStatus.NO_CONTENT)
        verify(exactly = 1) { jwtTokenService.generateToken("max", 3600, true) }
        val cookie = response.getCookie(TafelLoginFilter.jwtCookieName)!!
        assertThat(cookie.value).isEqualTo("FULL-TOKEN")
        assertThat(cookie.maxAge).isEqualTo(3600)
    }

    @Test
    fun `enabling with a wrong code is refused and sets no cookie`() {
        signedIn()
        every { mfaService.enable("max", "000000", null) } returns false
        every { mfaService.enableEmail("max", "000000", null) } returns false

        assertThrows<BusinessRuleException> { controller.enable(enableRequest("000000"), request, response) }
        assertThrows<BusinessRuleException> { controller.enableEmail(enableRequest("000000"), request, response) }

        assertThat(response.getCookie(TafelLoginFilter.jwtCookieName)).isNull()
    }

    @Test
    fun `the code of a method the user already has is handed on when a second method is switched on`() {
        signedIn()
        every { mfaService.enable("max", "123456", "777777") } returns true
        every { mfaService.enableEmail("max", "654321", "888888") } returns true

        controller.enable(enableRequest("123456", currentCode = "777777"), request, response)
        controller.enableEmail(enableRequest("654321", currentCode = "888888"), request, response)

        verify(exactly = 1) { mfaService.enable("max", "123456", "777777") }
        verify(exactly = 1) { mfaService.enableEmail("max", "654321", "888888") }
    }

    @Test
    fun `the e-mail setup sends a code and answers 202`() {
        signedIn()

        val result = controller.setupEmail()

        assertThat(result.statusCode).isEqualTo(HttpStatus.ACCEPTED)
        verify(exactly = 1) { mfaService.startEmailSetup("max") }
    }

    @Test
    fun `enabling e-mail answers with a session that has passed the second factor`() {
        signedIn()
        every { mfaService.enableEmail("max", "654321", null) } returns true

        val result = controller.enableEmail(enableRequest("654321"), request, response)

        assertThat(result.statusCode).isEqualTo(HttpStatus.NO_CONTENT)
        assertThat(response.getCookie(TafelLoginFilter.jwtCookieName)!!.value).isEqualTo("FULL-TOKEN")
    }

    @Test
    fun `a login that owes its code can have the e-mailed one sent`() {
        signedIn(mfaPending = true)

        val result = controller.sendLoginCode()

        assertThat(result.statusCode).isEqualTo(HttpStatus.ACCEPTED)
        verify(exactly = 1) { mfaService.sendLoginCode("max") }
    }

    @Test
    fun `disabling names the method and needs a valid code`() {
        signedIn()
        every { mfaService.disable("max", MfaMethod.EMAIL, "123456") } returns true
        every { mfaService.disable("max", MfaMethod.TOTP, "000000") } returns false

        assertThat(controller.disable(MfaDisableRequest(MfaMethod.EMAIL, "123456")).statusCode).isEqualTo(HttpStatus.NO_CONTENT)
        assertThrows<BusinessRuleException> { controller.disable(MfaDisableRequest(MfaMethod.TOTP, "000000")) }
    }

    @Test
    fun `the last method cannot be disabled while the deployment requires one`() {
        signedIn()
        every { mfaService.disable(any(), any(), any()) } throws ConflictException("Eine Zwei-Faktor-Authentifizierung ist verpflichtend")

        assertThrows<ConflictException> { controller.disable(MfaDisableRequest(MfaMethod.TOTP, "123456")) }
    }

    @Test
    fun `a valid code finishes a login with a full session`() {
        signedIn(mfaPending = true)
        every { mfaService.verifyLogin("max", "123456") } returns true

        val result = controller.verify(code(), request, response)

        assertThat(result.statusCode).isEqualTo(HttpStatus.NO_CONTENT)
        verify(exactly = 1) { jwtTokenService.generateToken("max", 3600, true) }
        assertThat(response.getCookie(TafelLoginFilter.jwtCookieName)!!.value).isEqualTo("FULL-TOKEN")
    }

    @Test
    fun `an account that still has to change its password stays on the short-lived token after the code`() {
        signedIn(mfaPending = true)
        every { mfaService.verifyLogin("max", "123456") } returns true
        every { userDetailsManager.loadUserByUsername("max") } returns testUser.copy(username = "max", passwordChangeRequired = true)

        controller.verify(code(), request, response)

        verify(exactly = 1) { jwtTokenService.generateToken("max", 300, true) }
    }

    @Test
    fun `a wrong or locked-out code finishes nothing and sets no cookie`() {
        signedIn(mfaPending = true)
        every { mfaService.verifyLogin("max", "000000") } returns false

        assertThrows<BusinessRuleException> { controller.verify(code("000000"), request, response) }

        assertThat(response.getCookie(TafelLoginFilter.jwtCookieName)).isNull()
    }

    @Test
    fun `verifying on a session that owes no code is refused`() {
        signedIn()

        assertThrows<BusinessRuleException> { controller.verify(code(), request, response) }

        verify(exactly = 0) { mfaService.verifyLogin(any(), any()) }
    }
}
