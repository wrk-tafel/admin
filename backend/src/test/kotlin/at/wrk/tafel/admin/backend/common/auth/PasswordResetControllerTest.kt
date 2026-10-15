package at.wrk.tafel.admin.backend.common.auth

import at.wrk.tafel.admin.backend.common.auth.components.InvalidResetLinkException
import at.wrk.tafel.admin.backend.common.auth.components.PasswordChangeException
import at.wrk.tafel.admin.backend.common.auth.components.PasswordResetService
import at.wrk.tafel.admin.backend.common.auth.model.PasswordResetConfirmRequest
import at.wrk.tafel.admin.backend.common.auth.model.PasswordResetConfirmResponse
import at.wrk.tafel.admin.backend.common.auth.model.PasswordResetRequest
import io.mockk.every
import io.mockk.justRun
import io.mockk.mockk
import io.mockk.verify
import org.assertj.core.api.Assertions.assertThat
import org.junit.jupiter.api.Test
import org.springframework.http.HttpStatus

class PasswordResetControllerTest {

    private val service = mockk<PasswordResetService>()
    private val controller = PasswordResetController(service)

    @Test
    fun `a request is always accepted`() {
        justRun { service.request("max") }

        val response = controller.requestReset(PasswordResetRequest("max"))

        assertThat(response.statusCode).isEqualTo(HttpStatus.ACCEPTED)
        verify { service.request("max") }
    }

    @Test
    fun `a confirmed reset answers with no content`() {
        justRun { service.confirm("token", "aNewSecretPassword-123") }

        val response = controller.confirmReset(PasswordResetConfirmRequest("token", "aNewSecretPassword-123"))

        assertThat(response.statusCode).isEqualTo(HttpStatus.NO_CONTENT)
    }

    @Test
    fun `an invalid link answers with gone`() {
        every { service.confirm(any(), any()) } throws InvalidResetLinkException()

        val response = controller.confirmReset(PasswordResetConfirmRequest("token", "aNewSecretPassword-123"))

        assertThat(response.statusCode).isEqualTo(HttpStatus.GONE)
        assertThat(response.body!!.message).contains("ungültig oder abgelaufen")
    }

    @Test
    fun `a refused password answers with the policy's details`() {
        every { service.confirm(any(), any()) } throws PasswordChangeException("Das neue Passwort ist ungültig!", listOf("Mindestlänge: 12"))

        val response = controller.confirmReset(PasswordResetConfirmRequest("token", "short"))

        assertThat(response.statusCode).isEqualTo(HttpStatus.BAD_REQUEST)
        assertThat(response.body).isEqualTo(PasswordResetConfirmResponse("Das neue Passwort ist ungültig!", listOf("Mindestlänge: 12")))
    }
}
