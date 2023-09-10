package at.wrk.tafel.admin.backend.common.auth

import at.wrk.tafel.admin.backend.common.ExcludeFromTestCoverage
import at.wrk.tafel.admin.backend.common.auth.components.PasswordChangeException
import at.wrk.tafel.admin.backend.common.auth.components.TafelLoginFilter
import at.wrk.tafel.admin.backend.common.auth.components.TafelUserDetailsManager
import at.wrk.tafel.admin.backend.common.auth.model.ChangePasswordRequest
import at.wrk.tafel.admin.backend.common.auth.model.ChangePasswordResponse
import at.wrk.tafel.admin.backend.common.auth.model.TafelJwtAuthentication
import at.wrk.tafel.admin.backend.common.auth.model.TafelUser
import at.wrk.tafel.admin.backend.common.auth.model.User
import at.wrk.tafel.admin.backend.common.auth.model.UserListResponse
import at.wrk.tafel.admin.backend.modules.base.exception.TafelValidationException
import jakarta.servlet.http.HttpServletRequest
import jakarta.servlet.http.HttpServletResponse
import org.slf4j.LoggerFactory
import org.springframework.http.HttpStatus
import org.springframework.http.ResponseEntity
import org.springframework.security.access.prepost.PreAuthorize
import org.springframework.security.core.context.SecurityContextHolder
import org.springframework.web.bind.annotation.GetMapping
import org.springframework.web.bind.annotation.PathVariable
import org.springframework.web.bind.annotation.PostMapping
import org.springframework.web.bind.annotation.RequestBody
import org.springframework.web.bind.annotation.RequestMapping
import org.springframework.web.bind.annotation.RequestParam
import org.springframework.web.bind.annotation.RestController

@RestController
@RequestMapping("/api/users")
@PreAuthorize("isAuthenticated()")
class UserController(
    private val userDetailsManager: TafelUserDetailsManager
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
    fun logout(request: HttpServletRequest, response: HttpServletResponse): ResponseEntity<Unit> {
        val user = SecurityContextHolder.getContext().authentication as TafelJwtAuthentication

        val cookie = TafelLoginFilter.createTokenCookie(null, 0, request)
        response.addCookie(cookie)

        logger.info("User ${user.username} logged out!")
        return ResponseEntity.ok().build()
    }

    @GetMapping("/{userId}")
    @PreAuthorize("hasAuthority('USER-MANAGEMENT')")
    fun getUser(@PathVariable("userId") userId: Long): ResponseEntity<User> {
        val userDetails = userDetailsManager.loadUserById(userId)
            ?: throw TafelValidationException("Benutzer (ID: $userId) nicht gefunden!")
        val user = mapToResponse(userDetails)
        return ResponseEntity.ok(user)
    }

    @GetMapping
    @PreAuthorize("hasAuthority('USER-MANAGEMENT')")
    fun getUsers(
        @RequestParam("personnelnumber") personnelNumber: String? = null,
        @RequestParam firstname: String? = null,
        @RequestParam lastname: String? = null
    ): UserListResponse {
        if (personnelNumber != null) {
            val user = userDetailsManager.loadUserByPersonnelNumber(personnelNumber)
                ?: throw TafelValidationException("Benutzer (Personalnummer: $personnelNumber) nicht gefunden!")
            return UserListResponse(items = listOf(mapToResponse(user)))
        }

        val users = userDetailsManager.loadUsers(firstname, lastname)
            .map { mapToResponse(it) }
        return UserListResponse(items = users)
    }

    private fun mapToResponse(user: TafelUser): User {
        return User(
            id = user.id,
            username = user.username,
            personnelNumber = user.personnelNumber,
            firstname = user.firstname,
            lastname = user.lastname
        )
    }

}

@ExcludeFromTestCoverage
data class UserInfo(
    val username: String,
    val permissions: List<String>
)
