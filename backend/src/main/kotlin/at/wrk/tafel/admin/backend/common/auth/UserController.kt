package at.wrk.tafel.admin.backend.common.auth

import at.wrk.tafel.admin.backend.common.api.PagedResponse
import at.wrk.tafel.admin.backend.common.auth.components.PasswordChangeException
import at.wrk.tafel.admin.backend.common.auth.components.TafelLoginFilter
import at.wrk.tafel.admin.backend.common.auth.components.TafelPasswordGenerator
import at.wrk.tafel.admin.backend.common.auth.components.TafelUserDetailsManager
import at.wrk.tafel.admin.backend.common.auth.model.*
import at.wrk.tafel.admin.backend.config.properties.TafelAdminProperties
import at.wrk.tafel.admin.backend.modules.base.exception.BusinessRuleException
import at.wrk.tafel.admin.backend.modules.base.exception.ConflictException
import at.wrk.tafel.admin.backend.modules.base.exception.NotFoundException
import jakarta.servlet.http.HttpServletRequest
import jakarta.servlet.http.HttpServletResponse
import jakarta.validation.Valid
import org.slf4j.LoggerFactory
import org.springframework.http.HttpStatus
import org.springframework.http.ResponseEntity
import org.springframework.security.access.prepost.PreAuthorize
import org.springframework.security.core.authority.SimpleGrantedAuthority
import org.springframework.security.core.context.SecurityContextHolder
import org.springframework.security.core.userdetails.UsernameNotFoundException
import org.springframework.transaction.annotation.Transactional
import org.springframework.web.bind.annotation.*

@RestController
@RequestMapping("/api/users")
@PreAuthorize("isAuthenticated()")
class UserController(
    private val userDetailsManager: TafelUserDetailsManager,
    private val tafelPasswordGenerator: TafelPasswordGenerator,
    private val tafelAdminProperties: TafelAdminProperties,
) {

    companion object {
        private val logger = LoggerFactory.getLogger(UserController::class.java)
    }

    @GetMapping("/info")
    fun getUserInfo(): ResponseEntity<UserInfoResponse> {
        val authenticatedUser = SecurityContextHolder.getContext().authentication as TafelJwtAuthentication

        val userInfo = UserInfoResponse(
            username = authenticatedUser.username!!,
            permissions = authenticatedUser.authorities.mapNotNull { it.authority },
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
    @Transactional
    fun changePassword(@Valid @RequestBody request: ChangePasswordRequest): ResponseEntity<ChangePasswordResponse> {
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

        val cookie = TafelLoginFilter.createTokenCookie(null, 0, tafelAdminProperties.server.relativeBaseUrl, request)
        response.addCookie(cookie)

        logger.info("User ${user.username} logged out!")
        return ResponseEntity.ok().build()
    }

    @GetMapping("/{userId}")
    @PreAuthorize("hasAuthority('USER_MANAGEMENT')")
    fun getUser(@PathVariable userId: Long): ResponseEntity<UserResponse> {
        val userDetails = userDetailsManager.loadUserById(userId)
            ?: throw NotFoundException("Benutzer (ID: $userId) nicht gefunden!")
        val user = mapToResponse(userDetails)
        return ResponseEntity.ok(user)
    }

    @GetMapping("/personnel-number/{personnelNumber}")
    @PreAuthorize("hasAuthority('USER_MANAGEMENT')")
    fun getUserByPersonnelNumber(@PathVariable personnelNumber: String): ResponseEntity<UserResponse> {
        val userDetails = userDetailsManager.loadUserByPersonnelNumber(personnelNumber.trim())
            ?: throw NotFoundException("Benutzer (Personalnummer: $personnelNumber) nicht gefunden!")
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
    ): PagedResponse<UserResponse> {
        val userSearchResult = userDetailsManager.loadUsers(
            username = username?.trim(),
            firstname = firstname?.trim(),
            lastname = lastname?.trim(),
            enabled = enabled,
            page = page,
        )
        return PagedResponse(
            items = userSearchResult.items.map { mapToResponse(it) },
            totalCount = userSearchResult.totalCount,
            currentPage = userSearchResult.currentPage,
            totalPages = userSearchResult.totalPages,
            pageSize = userSearchResult.pageSize,
        )
    }

    @PostMapping
    @PreAuthorize("hasAuthority('USER_MANAGEMENT')")
    @Transactional
    fun createUser(
        @Valid @RequestBody user: UserRequest,
    ): ResponseEntity<UserResponse> {
        validateIfUserExists(user)

        val tafelUser = mapToTafelUser(user)
        userDetailsManager.createUser(tafelUser)

        val userResponse = mapToResponse(userDetailsManager.loadUserByUsername(user.username))
        return ResponseEntity.status(HttpStatus.CREATED).body(userResponse)
    }

    private fun validateIfUserExists(user: UserRequest) {
        try {
            userDetailsManager.loadUserByUsername(user.username)
            throw ConflictException("Benutzer (Benutzername: ${user.username}) existiert bereits!")
        } catch (_: UsernameNotFoundException) {
            // ignore
        }

        userDetailsManager.loadUserByPersonnelNumber(user.personnelNumber)?.let {
            throw ConflictException("Benutzer (Personalnummer: ${user.personnelNumber}) existiert bereits!")
        }
    }

    @PutMapping("/{userId}")
    @PreAuthorize("hasAuthority('USER_MANAGEMENT')")
    @Transactional
    fun updateUser(
        @PathVariable userId: Long,
        @Valid @RequestBody user: UserRequest,
    ): ResponseEntity<UserResponse> {
        userDetailsManager.loadUserById(userId)
            ?: throw NotFoundException("Benutzer (ID: $userId) nicht vorhanden!")

        if (user.password != user.passwordRepeat) {
            throw BusinessRuleException("Passwörter stimmen nicht überein!")
        }

        try {
            val updatedTafelUser = mapToTafelUser(user)
            userDetailsManager.updateUser(updatedTafelUser)

            val userResponse = mapToResponse(userDetailsManager.loadUserById(userId)!!)
            return ResponseEntity.ok(userResponse)
        } catch (e: PasswordChangeException) {
            throw BusinessRuleException(e.message)
        }
    }

    @DeleteMapping("/{userId}")
    @PreAuthorize("hasAuthority('USER_MANAGEMENT')")
    @Transactional
    fun deleteUser(
        @PathVariable userId: Long,
    ): ResponseEntity<Unit> {
        val tafelUser = userDetailsManager.loadUserById(userId)
            ?: throw NotFoundException("Benutzer (ID: $userId) nicht vorhanden!")

        userDetailsManager.deleteUser(tafelUser.username)
        return ResponseEntity.noContent().build()
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

    private fun mapToTafelUser(user: UserRequest): TafelUser = TafelUser(
        id = user.id,
        username = user.username,
        personnelNumber = user.personnelNumber,
        firstname = user.firstname,
        lastname = user.lastname,
        enabled = user.enabled,
        password = user.password,
        passwordChangeRequired = user.passwordChangeRequired,
        authorities = user.permissions.map { SimpleGrantedAuthority(it.key) },
    )

    private fun mapToResponse(user: TafelUser): UserResponse = UserResponse(
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
            .filter { it.authority != null }
            .map { authority -> mapToUserPermission(authority.authority!!) }
            .sortedBy { it.title },
    )

    private fun mapToUserPermission(key: String): UserPermissionItem {
        val permissionEnum = UserPermissions.valueOfKey(key)
        return UserPermissionItem(
            key = permissionEnum.key,
            title = permissionEnum.title,
            category = permissionEnum.category.title,
        )
    }
}
