package at.wrk.tafel.admin.backend.common.auth

import at.wrk.tafel.admin.backend.common.auth.components.PasswordChangeException
import at.wrk.tafel.admin.backend.common.auth.model.ChangePasswordRequest
import at.wrk.tafel.admin.backend.common.auth.model.ChangePasswordResponse
import org.slf4j.LoggerFactory
import org.springframework.http.HttpStatus
import org.springframework.http.ResponseEntity
import org.springframework.security.access.prepost.PreAuthorize
import org.springframework.security.provisioning.UserDetailsManager
import org.springframework.web.bind.annotation.PostMapping
import org.springframework.web.bind.annotation.RequestBody
import org.springframework.web.bind.annotation.RequestMapping
import org.springframework.web.bind.annotation.RestController

@RestController
@RequestMapping("/api/users")
@PreAuthorize("isAuthenticated()")
class UserController(
    private val userDetailsManager: UserDetailsManager
) {
    private val logger = LoggerFactory.getLogger(UserController::class.java)

    @PostMapping("/change-password")
    fun changePassword(@RequestBody request: ChangePasswordRequest): ResponseEntity<ChangePasswordResponse> {
        try {
            userDetailsManager.changePassword(request.passwordCurrent, request.passwordNew)
        } catch (e: PasswordChangeException) {
            val validationResult = ChangePasswordResponse(message = e.message, details = e.validationDetails)
            return ResponseEntity.status(HttpStatus.UNPROCESSABLE_ENTITY).body(validationResult)
        }
        return ResponseEntity.ok().build()
    }

}
