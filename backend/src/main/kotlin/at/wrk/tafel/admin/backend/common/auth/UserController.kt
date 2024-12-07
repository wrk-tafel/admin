package at.wrk.tafel.admin.backend.common.auth

import at.wrk.tafel.admin.backend.common.auth.components.PasswordChangeException
import at.wrk.tafel.admin.backend.common.auth.components.TafelLoginFilter
import at.wrk.tafel.admin.backend.common.auth.components.TafelPasswordGenerator
import at.wrk.tafel.admin.backend.common.auth.components.TafelUserDetailsManager
import at.wrk.tafel.admin.backend.common.auth.model.ChangePasswordRequest
import at.wrk.tafel.admin.backend.common.auth.model.ChangePasswordResponse
import at.wrk.tafel.admin.backend.common.auth.model.GeneratedPasswordResponse
import at.wrk.tafel.admin.backend.common.auth.model.PermissionsListResponse
import at.wrk.tafel.admin.backend.common.auth.model.TafelJwtAuthentication
import at.wrk.tafel.admin.backend.common.auth.model.TafelUser
import at.wrk.tafel.admin.backend.common.auth.model.User
import at.wrk.tafel.admin.backend.common.auth.model.UserInfo
import at.wrk.tafel.admin.backend.common.auth.model.UserListResponse
import at.wrk.tafel.admin.backend.common.auth.model.UserPermission
import at.wrk.tafel.admin.backend.common.auth.model.UserPermissions
import at.wrk.tafel.admin.backend.modules.base.exception.TafelValidationException
import jakarta.servlet.http.HttpServletRequest
import jakarta.servlet.http.HttpServletResponse
import org.slf4j.LoggerFactory
import org.springframework.http.HttpStatus
import org.springframework.http.ResponseEntity
import org.springframework.security.access.prepost.PreAuthorize
import org.springframework.security.core.authority.SimpleGrantedAuthority
import org.springframework.security.core.context.SecurityContextHolder
import org.springframework.security.core.userdetails.UsernameNotFoundException
import org.springframework.web.bind.annotation.DeleteMapping
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
    private val userDetailsManager: TafelUserDetailsManager,
    private val tafelPasswordGenerator: TafelPasswordGenerator
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

    @GetMapping("/generate-password")
    fun generatePassword(): ResponseEntity<GeneratedPasswordResponse> {
        val generatedPassword = tafelPasswordGenerator.generatePassword()
        val response = GeneratedPasswordResponse(password = generatedPassword)
        return ResponseEntity.ok(response)
    }

    @PostMapping("/change-password")
    fun changePassword(@RequestBody request: ChangePasswordRequest): ResponseEntity<ChangePasswordResponse> {
        try {
            userDetailsManager.changePassword(request.passwordCurrent, request.passwordNew)
        } catch (e: PasswordChangeException) {
            val validationResult = ChangePasswordResponse(message = e.message, details = e.validationDetails)
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(validationResult)
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
    @PreAuthorize("hasAuthority('USER_MANAGEMENT')")
    fun getUser(@PathVariable("userId") userId: Long): ResponseEntity<User> {
        val userDetails = userDetailsManager.loadUserById(userId)
            ?: throw TafelValidationException(
                message = "Benutzer (ID: $userId) nicht gefunden!",
                status = HttpStatus.NOT_FOUND
            )
        val user = mapToResponse(userDetails)
        return ResponseEntity.ok(user)
    }

    @GetMapping("/personnel-number/{personnelNumber}")
    @PreAuthorize("hasAuthority('USER_MANAGEMENT')")
    fun getUserByPersonnelNumber(@PathVariable("personnelNumber") personnelNumber: String): ResponseEntity<User> {
        val userDetails = userDetailsManager.loadUserByPersonnelNumber(personnelNumber.trim())
            ?: throw TafelValidationException(
                message = "Benutzer (Personalnummer: $personnelNumber) nicht gefunden!",
                status = HttpStatus.NOT_FOUND
            )
        val user = mapToResponse(userDetails)
        return ResponseEntity.ok(user)
    }

    @GetMapping
    @PreAuthorize("hasAuthority('USER_MANAGEMENT')")
    fun getUsers(
        @RequestParam username: String? = null,
        @RequestParam firstname: String? = null,
        @RequestParam lastname: String? = null,
        @RequestParam enabled: Boolean? = null,
        @RequestParam page: Int? = null,
    ): UserListResponse {
        val userSearchResult = userDetailsManager.loadUsers(
            username = username?.trim(),
            firstname = firstname?.trim(),
            lastname = lastname?.trim(),
            enabled = enabled,
            page = page
        )
        return UserListResponse(
            items = userSearchResult.items.map { mapToResponse(it) },
            totalCount = userSearchResult.totalCount,
            currentPage = userSearchResult.currentPage,
            totalPages = userSearchResult.totalPages,
            pageSize = userSearchResult.pageSize
        )
    }

    @PostMapping
    @PreAuthorize("hasAuthority('USER_MANAGEMENT')")
    fun createUser(
        @RequestBody user: User
    ): ResponseEntity<User> {
        validateIfUserExists(user)

        val tafelUser = mapToTafelUser(user)
        userDetailsManager.createUser(tafelUser)

        val userResponse = mapToResponse(userDetailsManager.loadUserByUsername(user.username))
        return ResponseEntity.ok(userResponse)
    }

    private fun validateIfUserExists(user: User) {
        try {
            userDetailsManager.loadUserByUsername(user.username)
            throw TafelValidationException("Benutzer (Benutzername: ${user.username}) existiert bereits!")
        } catch (_: UsernameNotFoundException) {
            // ignore
        }

        userDetailsManager.loadUserByPersonnelNumber(user.personnelNumber)?.let {
            throw TafelValidationException("Benutzer (Personalnummer: ${user.personnelNumber}) existiert bereits!")
        }
    }

    @PostMapping("/{userId}")
    @PreAuthorize("hasAuthority('USER_MANAGEMENT')")
    fun updateUser(
        @PathVariable("userId") userId: Long,
        @RequestBody user: User
    ): ResponseEntity<User> {
        userDetailsManager.loadUserById(userId)
            ?: throw TafelValidationException(
                message = "Benutzer (ID: $userId) nicht vorhanden!",
                status = HttpStatus.NOT_FOUND
            )

        if (user.password != user.passwordRepeat) {
            throw TafelValidationException(
                message = "Passwörter stimmen nicht überein!",
                status = HttpStatus.BAD_REQUEST
            )
        }

        try {
            val updatedTafelUser = mapToTafelUser(user)
            userDetailsManager.updateUser(updatedTafelUser)

            val userResponse = mapToResponse(userDetailsManager.loadUserById(userId)!!)
            return ResponseEntity.ok(userResponse)
        } catch (e: PasswordChangeException) {
            throw TafelValidationException(e.message)
        }
    }

    @DeleteMapping("/{userId}")
    @PreAuthorize("hasAuthority('USER_MANAGEMENT')")
    fun deleteUser(
        @PathVariable("userId") userId: Long
    ) {
        val tafelUser = userDetailsManager.loadUserById(userId)
            ?: throw TafelValidationException(
                message = "Benutzer (ID: $userId) nicht vorhanden!",
                status = HttpStatus.NOT_FOUND
            )

        userDetailsManager.deleteUser(tafelUser.username)
    }

    @GetMapping("/permissions")
    @PreAuthorize("hasAuthority('USER_MANAGEMENT')")
    fun getPermissions(): ResponseEntity<PermissionsListResponse> {
        val permissions = UserPermissions.values()
            .toList()
            .sortedBy { it.title }
            .mapNotNull { mapToUserPermission(it.key) }
        return ResponseEntity.ok(PermissionsListResponse(permissions = permissions))
    }

    private fun mapToTafelUser(user: User): TafelUser {
        return TafelUser(
            id = user.id,
            username = user.username,
            personnelNumber = user.personnelNumber,
            firstname = user.firstname,
            lastname = user.lastname,
            enabled = user.enabled,
            password = user.password,
            passwordChangeRequired = user.passwordChangeRequired,
            authorities = user.permissions.map { SimpleGrantedAuthority(it.key) }
        )
    }

    private fun mapToResponse(user: TafelUser): User {
        return User(
            id = user.id,
            username = user.username,
            personnelNumber = user.personnelNumber,
            firstname = user.firstname,
            lastname = user.lastname,
            enabled = user.isEnabled,
            password = null,
            passwordRepeat = null,
            passwordChangeRequired = user.passwordChangeRequired,
            permissions = user.authorities
                .mapNotNull { authority -> mapToUserPermission(authority.authority) }
                .sortedBy { it.title }
        )
    }

    private fun mapToUserPermission(key: String): UserPermission {
        val permissionEnum = UserPermissions.valueOfKey(key)
        return UserPermission(
            key = permissionEnum.key,
            title = permissionEnum.title
        )
    }

}
