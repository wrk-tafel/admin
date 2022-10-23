package at.wrk.tafel.admin.backend.security

import at.wrk.tafel.admin.backend.security.components.PasswordException
import at.wrk.tafel.admin.backend.security.model.ChangePasswordRequest
import at.wrk.tafel.admin.backend.security.model.ChangePasswordResponse
import org.passay.RuleResult
import org.slf4j.LoggerFactory
import org.springframework.http.HttpStatus
import org.springframework.http.ResponseEntity
import org.springframework.security.access.prepost.PreAuthorize
import org.springframework.security.provisioning.UserDetailsManager
import org.springframework.web.bind.annotation.PostMapping
import org.springframework.web.bind.annotation.RequestMapping
import org.springframework.web.bind.annotation.RestController

@RestController
@RequestMapping("/api/users")
@PreAuthorize("isAuthenticated()")
class UserController(
    private val userDetailsManager: UserDetailsManager
) {
    private val logger = LoggerFactory.getLogger(UserController::class.java)

    @PostMapping
    fun changePassword(request: ChangePasswordRequest): ResponseEntity<ChangePasswordResponse> {
        try {
            userDetailsManager.changePassword(request.oldPassword, request.newPassword)
        } catch (e: PasswordException) {
            val validationResult = mapValidationResult(e.message, e.validationResult)
            return ResponseEntity.status(HttpStatus.UNPROCESSABLE_ENTITY).body(validationResult)
        }
        return ResponseEntity.ok().build()
    }

    private fun mapValidationResult(message: String, validationResult: RuleResult?): ChangePasswordResponse {
        // TODO
        return ChangePasswordResponse(message = message)
    }

}
