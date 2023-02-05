package at.wrk.tafel.admin.backend.common.auth

import at.wrk.tafel.admin.backend.common.ExcludeFromTestCoverage
import at.wrk.tafel.admin.backend.common.auth.components.PasswordChangeException
import at.wrk.tafel.admin.backend.common.auth.components.TafelLoginFilter
import at.wrk.tafel.admin.backend.common.auth.model.ChangePasswordRequest
import at.wrk.tafel.admin.backend.common.auth.model.ChangePasswordResponse
import at.wrk.tafel.admin.backend.common.auth.model.TafelJwtAuthentication
import jakarta.servlet.http.HttpServletRequest
import jakarta.servlet.http.HttpServletResponse
import org.slf4j.LoggerFactory
import org.springframework.http.HttpStatus
import org.springframework.http.ResponseEntity
import org.springframework.security.access.prepost.PreAuthorize
import org.springframework.security.core.context.SecurityContextHolder
import org.springframework.security.provisioning.UserDetailsManager
import org.springframework.web.bind.annotation.*

@RestController
@RequestMapping("/api/users")
@PreAuthorize("isAuthenticated()")
class UserController(
    private val userDetailsManager: UserDetailsManager
) {

    companion object {
        private val logger = LoggerFactory.getLogger(UserController::class.java)
    }

    @GetMapping("/info")
    fun getUserInfo(): ResponseEntity<UserInfo> {
        val authenticatedUser = SecurityContextHolder.getContext().authentication as TafelJwtAuthentication

        val userInfo = UserInfo(
            username = authenticatedUser.username!!,
            permissions = authenticatedUser.authorities.map { it.authority }
        )

        return ResponseEntity.ok(userInfo)
    }

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

    @PostMapping("/logout")
    fun logout(request: HttpServletRequest, response: HttpServletResponse): ResponseEntity<Void> {
        val user = SecurityContextHolder.getContext().authentication as TafelJwtAuthentication

        val cookie = TafelLoginFilter.createTokenCookie(null, 0, request)
        response.addCookie(cookie)

        logger.info("User ${user.username} logged out!")
        return ResponseEntity.ok().build()
    }

}

@ExcludeFromTestCoverage
data class UserInfo(
    val username: String,
    val permissions: List<String>
)
