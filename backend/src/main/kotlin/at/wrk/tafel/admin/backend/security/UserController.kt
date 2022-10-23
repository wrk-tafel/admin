package at.wrk.tafel.admin.backend.security

import at.wrk.tafel.admin.backend.security.model.ChangePasswordRequest
import org.slf4j.LoggerFactory
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
    fun changePassword(request: ChangePasswordRequest): ResponseEntity<Void> {
        userDetailsManager.changePassword(request.oldPassword, request.newPassword)
        return ResponseEntity.ok().build()
    }

}
