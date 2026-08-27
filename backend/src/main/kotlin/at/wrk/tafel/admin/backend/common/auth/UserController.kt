package at.wrk.tafel.admin.backend.common.auth

import at.wrk.tafel.admin.backend.common.api.PagedResponse
import at.wrk.tafel.admin.backend.common.api.PaginationDefaults
import at.wrk.tafel.admin.backend.common.auth.components.JwtTokenService
import at.wrk.tafel.admin.backend.common.auth.components.LoginAttemptService
import at.wrk.tafel.admin.backend.common.auth.components.PasswordChangeException
import at.wrk.tafel.admin.backend.common.auth.components.TafelLoginFilter
import at.wrk.tafel.admin.backend.common.auth.components.TafelPasswordGenerator
import at.wrk.tafel.admin.backend.common.auth.components.TafelUserDetailsManager
import at.wrk.tafel.admin.backend.common.auth.components.UserExportFileResult
import at.wrk.tafel.admin.backend.common.auth.components.UserExportService
import at.wrk.tafel.admin.backend.common.auth.model.*
import at.wrk.tafel.admin.backend.common.http.ContentDispositionUtil
import at.wrk.tafel.admin.backend.common.sanitizeForLog
import at.wrk.tafel.admin.backend.config.properties.ApplicationProperties
import at.wrk.tafel.admin.backend.config.properties.TafelAdminProperties
import at.wrk.tafel.admin.backend.modules.base.exception.BusinessRuleException
import at.wrk.tafel.admin.backend.modules.base.exception.ConflictException
import at.wrk.tafel.admin.backend.modules.base.exception.NotFoundException
import at.wrk.tafel.admin.backend.modules.base.exception.TafelApiException
import jakarta.servlet.http.HttpServletRequest
import jakarta.servlet.http.HttpServletResponse
import jakarta.validation.Valid
import org.slf4j.LoggerFactory
import org.springframework.core.io.InputStreamResource
import org.springframework.data.domain.PageRequest
import org.springframework.http.HttpStatus
import org.springframework.http.MediaType
import org.springframework.http.ResponseEntity
import org.springframework.security.access.prepost.PreAuthorize
import org.springframework.security.core.authority.SimpleGrantedAuthority
import org.springframework.security.core.context.SecurityContextHolder
import org.springframework.security.core.userdetails.UsernameNotFoundException
import org.springframework.transaction.annotation.Transactional
import org.springframework.web.bind.annotation.*
import java.io.ByteArrayInputStream
import java.time.LocalDateTime

@RestController
@RequestMapping("/api/users")
@PreAuthorize("isAuthenticated()")
class UserController(
    private val userDetailsManager: TafelUserDetailsManager,
    private val tafelPasswordGenerator: TafelPasswordGenerator,
    private val tafelAdminProperties: TafelAdminProperties,
    private val applicationProperties: ApplicationProperties,
    private val loginAttemptService: LoginAttemptService,
    private val userExportService: UserExportService,
    private val jwtTokenService: JwtTokenService,
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

    /**
     * The GDPR Art. 15/20 data takeout for the caller's own account (issue #3363, see
     * `docs/architecture/adr/0051-data-subject-requests-delegate-to-each-areas-own-export-and-delete.md`)
     * - a PDF, same shape as the household export. Self-service, same as [getUserInfo] - no
     * `USER_MANAGEMENT` needed, since the class-level `isAuthenticated()` already covers it.
     */
    @GetMapping("/export", produces = [MediaType.APPLICATION_PDF_VALUE])
    fun exportUser(): ResponseEntity<InputStreamResource> {
        val authenticatedUser = SecurityContextHolder.getContext().authentication as TafelJwtAuthentication
        val result = userExportService.exportUserByUsername(authenticatedUser.username!!)
            ?: throw NotFoundException("Benutzer nicht gefunden!")
        return exportResponse(result)
    }

    /**
     * The same takeout as [exportUser], admin-triggered for someone else's account - an HR-style
     * request made on a staff member's behalf, or after they've left. Behind `USER_MANAGEMENT`,
     * reachable from a user's detail screen.
     */
    @GetMapping("/{userId}/export", produces = [MediaType.APPLICATION_PDF_VALUE])
    @PreAuthorize("hasAuthority('USER_MANAGEMENT')")
    fun exportUserById(@PathVariable userId: Long): ResponseEntity<InputStreamResource> {
        val result = userExportService.exportUserById(userId)
            ?: throw NotFoundException("Benutzer (ID: $userId) nicht gefunden!")
        return exportResponse(result)
    }

    private fun exportResponse(result: UserExportFileResult): ResponseEntity<InputStreamResource> {
        val headers = ContentDispositionUtil.inline(result.filename)

        return ResponseEntity
            .ok()
            .headers(headers)
            .contentType(MediaType.APPLICATION_PDF)
            .body(InputStreamResource(ByteArrayInputStream(result.bytes)))
    }

    @GetMapping("/generate-password")
    @PreAuthorize("hasAuthority('USER_MANAGEMENT')")
    fun generatePassword(): ResponseEntity<GeneratedPasswordResponse> {
        val generatedPassword = tafelPasswordGenerator.generatePassword()
        val response = GeneratedPasswordResponse(password = generatedPassword)
        return ResponseEntity.ok(response)
    }

    @PostMapping("/change-password")
    @Transactional
    fun changePassword(
        @Valid @RequestBody changePasswordRequest: ChangePasswordRequest,
        request: HttpServletRequest,
        response: HttpServletResponse,
    ): ResponseEntity<ChangePasswordResponse> {
        try {
            userDetailsManager.changePassword(changePasswordRequest.passwordCurrent, changePasswordRequest.passwordNew)
        } catch (e: PasswordChangeException) {
            val validationResult = ChangePasswordResponse(message = e.message, details = e.validationDetails)
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(validationResult)
        }

        // Changing one's own password just invalidated every JWT issued for this account up to now
        // (see TafelUserDetailsManager.changePassword) - including the one this very request came in
        // on. The frontend explicitly keeps the user on this session afterwards ("Sie bleiben mit dem
        // neuen Passwort angemeldet"), so a fresh cookie has to replace it here, the same way
        // TafelLoginFilter mints one after a real login.
        val username = (SecurityContextHolder.getContext().authentication as TafelJwtAuthentication).username!!
        val expirationTimeInSeconds = applicationProperties.security.jwtToken.expirationTimeInSeconds
        val token = jwtTokenService.generateToken(username = username, expirationSeconds = expirationTimeInSeconds)
        val cookie = TafelLoginFilter.createTokenCookie(token, expirationTimeInSeconds, tafelAdminProperties.server.relativeBaseUrl, request)
        response.addCookie(cookie)

        return ResponseEntity.ok().build()
    }

    @PostMapping("/logout")
    fun logout(request: HttpServletRequest, response: HttpServletResponse): ResponseEntity<Unit> {
        val user = SecurityContextHolder.getContext().authentication as TafelJwtAuthentication

        // Clearing the cookie alone only removes it client-side - the JWT itself would otherwise
        // keep authenticating for the rest of its lifetime if it were captured beforehand.
        userDetailsManager.invalidateTokens(user.username!!)

        val cookie = TafelLoginFilter.createTokenCookie(null, 0, tafelAdminProperties.server.relativeBaseUrl, request)
        response.addCookie(cookie)

        logger.info("User ${sanitizeForLog(user.username)} logged out!")
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
        @RequestParam searchInput: String? = null,
        @RequestParam enabled: Boolean? = null,
        @RequestParam page: Int? = null,
        @RequestParam pageSize: Int? = null,
    ): PagedResponse<UserResponse> {
        val userSearchResult = userDetailsManager.loadUsers(
            searchInput = searchInput,
            enabled = enabled,
            page = page,
            pageSize = pageSize,
        )
        // One query for the whole page's lockout state rather than one per row - see
        // LoginAttemptService.getLockedUntil(Collection<String>).
        val lockedUntilByUsername = loginAttemptService.getLockedUntil(userSearchResult.items.map { it.username })
        return PagedResponse(
            items = userSearchResult.items.map { mapToResponse(it, lockedUntilByUsername[it.username]) },
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
        validateAdministratorAssignment(requested = user.permissions, current = emptyList())

        try {
            val tafelUser = mapToTafelUser(user)
            userDetailsManager.createUser(tafelUser)
        } catch (e: PasswordChangeException) {
            throw BusinessRuleException(e.message)
        }

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
        val existingUser = userDetailsManager.loadUserById(userId)
            ?: throw NotFoundException("Benutzer (ID: $userId) nicht vorhanden!")

        validateAdministratorAssignment(
            requested = user.permissions,
            current = existingUser.authorities.mapNotNull { it.authority },
        )
        // Revoking the permission and disabling the account are two ways of arriving at the same
        // place: an administrator who can no longer act.
        val keepsAdministrator = user.permissions.any { it.key == UserPermissions.ADMINISTRATOR.key } && user.enabled
        if (!keepsAdministrator) {
            validateNotLastAdministrator(userId, existingUser)
        }

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

        validateNotLastAdministrator(userId, tafelUser)

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

    @GetMapping("/login-attempts")
    @PreAuthorize("hasAuthority('USER_MANAGEMENT')")
    fun getLoginAttempts(
        @RequestParam searchInput: String? = null,
        @RequestParam lockedOnly: Boolean? = null,
        @RequestParam page: Int? = null,
        @RequestParam pageSize: Int? = null,
    ): PagedResponse<LoginAttemptItem> {
        val pageRequest = PageRequest.of(page?.minus(1) ?: 0, PaginationDefaults.resolvePageSize(pageSize))
        val pagedResult = loginAttemptService.findAll(
            pageRequest = pageRequest,
            searchInput = searchInput,
            lockedOnly = lockedOnly ?: false,
        )

        return PagedResponse(
            items = pagedResult.content,
            totalCount = pagedResult.totalElements,
            currentPage = page ?: 1,
            totalPages = pagedResult.totalPages,
            pageSize = pageRequest.pageSize,
        )
    }

    @GetMapping("/login-attempts/settings")
    @PreAuthorize("hasAuthority('USER_MANAGEMENT')")
    fun getLoginAttemptSettings(): ResponseEntity<LoginAttemptSettingsResponse> = ResponseEntity.ok(loginAttemptService.getSettings())

    @DeleteMapping("/login-attempts/{loginAttemptId}")
    @PreAuthorize("hasAuthority('USER_MANAGEMENT')")
    fun deleteLoginAttempt(@PathVariable loginAttemptId: Long): ResponseEntity<Unit> {
        loginAttemptService.deleteById(loginAttemptId)
        return ResponseEntity.noContent().build()
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

    /**
     * [lockedUntil] defaults to a per-user lookup so every single-user endpoint (get/create/update)
     * gets it for free; [getUsers] passes the batched result for its whole page instead, since a
     * default-per-row lookup there would be one query per row.
     */
    private fun mapToResponse(
        user: TafelUser,
        lockedUntil: LocalDateTime? = loginAttemptService.getLockedUntil(user.username),
    ): UserResponse = UserResponse(
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
        lockedUntil = lockedUntil,
    )

    /**
     * [UserPermissions.ADMINISTRATOR] grants every other permission, so handing it out is handing
     * out everything - only someone who already holds it may add or remove it. Without this,
     * `USER_MANAGEMENT` alone would be enough to promote yourself, which would make every other
     * permission check decorative.
     *
     * Both directions are guarded: revoking it matters as much as granting it, since otherwise a
     * user manager could lock the administrators out. Only an actual *change* is rejected, so a user
     * manager can still edit an administrator's name or personnel number as long as the permission
     * itself is submitted unchanged - which is what the (disabled) checkbox in the editor sends.
     */
    private fun validateAdministratorAssignment(requested: List<UserPermissionItem>, current: List<String>) {
        val administratorKey = UserPermissions.ADMINISTRATOR.key
        val requestedAdministrator = requested.any { it.key == administratorKey }
        val currentAdministrator = current.contains(administratorKey)
        if (requestedAdministrator == currentAdministrator) {
            return
        }

        val authenticatedUser = SecurityContextHolder.getContext().authentication as TafelJwtAuthentication
        if (authenticatedUser.authorities.none { it.authority == administratorKey }) {
            throw TafelApiException(
                HttpStatus.FORBIDDEN,
                "Die Berechtigung \"${UserPermissions.ADMINISTRATOR.title}\" kann nur von einem Administrator vergeben oder entzogen werden!",
            )
        }
    }

    /**
     * Refuses a change that would leave nobody able to administer the application. Only an
     * administrator can hand the permission out, so losing the last one is not a mistake anybody
     * could undo from inside the app - it would need a database edit.
     *
     * Applies to every route to that state: revoking the permission, disabling the account, and
     * deleting it outright. An account that is already disabled is exempt, since it wasn't the
     * safeguard to begin with.
     *
     * A [ConflictException] rather than a permission error: the caller may well be allowed to do
     * this in general, it is the resulting state that is not permitted.
     */
    private fun validateNotLastAdministrator(userId: Long, existingUser: TafelUser) {
        val isActiveAdministrator = existingUser.enabled &&
            existingUser.authorities.any { it.authority == UserPermissions.ADMINISTRATOR.key }
        if (!isActiveAdministrator) {
            return
        }

        if (!userDetailsManager.anotherEnabledAdministratorExists(userId)) {
            throw ConflictException(
                "Es muss mindestens ein aktiver Benutzer mit der Berechtigung " +
                    "\"${UserPermissions.ADMINISTRATOR.title}\" verbleiben!",
            )
        }
    }

    private fun mapToUserPermission(key: String): UserPermissionItem {
        val permissionEnum = UserPermissions.valueOfKey(key)
        return UserPermissionItem(
            key = permissionEnum.key,
            title = permissionEnum.title,
            category = permissionEnum.category.title,
        )
    }
}
