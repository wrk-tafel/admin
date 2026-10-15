package at.wrk.tafel.admin.backend.common.auth

import at.wrk.tafel.admin.backend.common.api.TafelPublicEndpoint
import at.wrk.tafel.admin.backend.common.auth.components.InvalidResetLinkException
import at.wrk.tafel.admin.backend.common.auth.components.PasswordChangeException
import at.wrk.tafel.admin.backend.common.auth.components.PasswordResetService
import at.wrk.tafel.admin.backend.common.auth.model.PasswordResetConfirmRequest
import at.wrk.tafel.admin.backend.common.auth.model.PasswordResetConfirmResponse
import at.wrk.tafel.admin.backend.common.auth.model.PasswordResetRequest
import jakarta.validation.Valid
import org.springframework.http.HttpStatus
import org.springframework.http.ResponseEntity
import org.springframework.web.bind.annotation.PostMapping
import org.springframework.web.bind.annotation.RequestBody
import org.springframework.web.bind.annotation.RequestMapping
import org.springframework.web.bind.annotation.RestController

/**
 * "Passwort vergessen?" - both endpoints are reached without a session (`WebSecurityConfig`'s public
 * endpoints, rate-limited per address), see [PasswordResetService] and ADR-0072.
 */
@RestController
@RequestMapping("/api/password-reset")
class PasswordResetController(
    private val passwordResetService: PasswordResetService,
) {

    /**
     * Always `202 Accepted`, whether an account was found or not - the answer must not tell an outsider
     * which usernames or addresses exist. Also `202` while the feature is switched off, for the same
     * reason; the login page hides the link then anyway.
     */
    @PostMapping("/request")
    @TafelPublicEndpoint
    fun requestReset(@Valid @RequestBody request: PasswordResetRequest): ResponseEntity<Unit> {
        passwordResetService.request(request.identifier)
        return ResponseEntity.accepted().build()
    }

    @PostMapping("/confirm")
    @TafelPublicEndpoint
    fun confirmReset(@Valid @RequestBody request: PasswordResetConfirmRequest): ResponseEntity<PasswordResetConfirmResponse> = try {
        passwordResetService.confirm(request.token, request.newPassword)
        ResponseEntity.noContent().build()
    } catch (e: InvalidResetLinkException) {
        ResponseEntity.status(HttpStatus.GONE).body(PasswordResetConfirmResponse(message = e.message!!))
    } catch (e: PasswordChangeException) {
        ResponseEntity.status(HttpStatus.BAD_REQUEST).body(PasswordResetConfirmResponse(message = e.message, details = e.validationDetails))
    }
}
