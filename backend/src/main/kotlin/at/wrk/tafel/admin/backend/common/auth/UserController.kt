package at.wrk.tafel.admin.backend.common.auth

import at.wrk.tafel.admin.backend.common.api.PagedResponse
import at.wrk.tafel.admin.backend.common.api.PaginationDefaults
import at.wrk.tafel.admin.backend.common.auth.components.JwtTokenService
import at.wrk.tafel.admin.backend.common.auth.components.LoginAttemptService
import at.wrk.tafel.admin.backend.common.auth.components.MfaService
import at.wrk.tafel.admin.backend.common.auth.components.PasswordChangeException
import at.wrk.tafel.admin.backend.common.auth.components.StaffPrivacyNoticeService
import at.wrk.tafel.admin.backend.common.auth.components.TafelLoginFilter
import at.wrk.tafel.admin.backend.common.auth.components.TafelPasswordGenerator
import at.wrk.tafel.admin.backend.common.auth.components.TafelUserDetailsManager
import at.wrk.tafel.admin.backend.common.auth.components.UserExportFileResult
import at.wrk.tafel.admin.backend.common.auth.components.UserExportService
import at.wrk.tafel.admin.backend.common.auth.components.UserPreferencesService
import at.wrk.tafel.admin.backend.common.auth.model.*
import at.wrk.tafel.admin.backend.common.http.ContentDispositionUtil
import at.wrk.tafel.admin.backend.common.sanitizeForLog
import at.wrk.tafel.admin.backend.config.properties.ApplicationProperties
import at.wrk.tafel.admin.backend.config.properties.TafelAdminProperties
import at.wrk.tafel.admin.backend.database.common.lock.AdvisoryLockKey
import at.wrk.tafel.admin.backend.database.common.lock.AdvisoryLockService
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
    private val staffPrivacyNoticeService: StaffPrivacyNoticeService,
    private val jwtTokenService: JwtTokenService,
    private val advisoryLockService: AdvisoryLockService,
    private val userPreferencesService: UserPreferencesService,
    private val mfaService: MfaService,
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
            theme = userPreferencesService.getTheme(authenticatedUser.username!!),
            mfaPending = authenticatedUser.mfaPending,
            mfaSetupRequired = authenticatedUser.mfaSetupRequired,
            mfaMethods = authenticatedUser.mfaMethods,
        )

        return ResponseEntity.ok(userInfo)
    }

    /**
     * The caller's own account as the "Meine Daten" tab of "Mein Konto" shows it. Self-service like
     * [getUserInfo], so `isAuthenticated()` is all it needs. Not recorded as a read: the breach
     * detection [getUser] feeds (`recordUserRead`) is about one account looking at another's data,
     * and this is a user looking at their own.
     */
    @GetMapping("/account")
    fun getAccount(): UserAccountResponse {
        val authenticatedUser = SecurityContextHolder.getContext().authentication as TafelJwtAuthentication
        return mapToAccountResponse(userDetailsManager.loadUserByUsername(authenticatedUser.username!!))
    }

    /**
     * What a user may change about their own account: the name and the e-mail address (see
     * [UserAccountRequest] for why nothing else). The username and the personnel number stay with
     * the administrator, so unlike [updateUser] nothing here can hand an account over, and the
     * session it came in on stays what it was - no replacement cookie needed. The write itself is
     * on the audit trail like any other change to a user or an employee.
     */
    @PutMapping("/account")
    @Transactional
    fun updateAccount(@Valid @RequestBody request: UserAccountRequest): UserAccountResponse {
        val authenticatedUser = SecurityContextHolder.getContext().authentication as TafelJwtAuthentication
        val updatedUser = userDetailsManager.updateOwnAccount(
            username = authenticatedUser.username!!,
            firstname = request.firstname.trim(),
            lastname = request.lastname.trim(),
            email = request.email?.trim()?.takeIf { it.isNotEmpty() },
        )
        return mapToAccountResponse(updatedUser)
    }

    private fun mapToAccountResponse(user: TafelUser): UserAccountResponse = UserAccountResponse(
        username = user.username,
        personnelNumber = user.personnelNumber,
        firstname = user.firstname,
        lastname = user.lastname,
        email = user.email,
    )

    /** The caller's own display preference - self-service, so `isAuthenticated()` is all it needs. */
    @PutMapping("/theme")
    fun updateTheme(@RequestBody request: UserThemeRequest): UserThemeResponse {
        val authenticatedUser = SecurityContextHolder.getContext().authentication as TafelJwtAuthentication
        return userPreferencesService.updateTheme(authenticatedUser.username!!, request.theme)
    }

    /**
     * The GDPR Art. 15/20 data takeout for the caller's own account (issue #3363, see
     * `docs/architecture/adr/0051-data-subject-requests-delegate-to-each-areas-own-export-and-delete.md`)
     * - a ZIP (`datenexport.pdf` plus a machine-readable `daten.json`, issue #3418), same shape as the
     * household export. Self-service, same as [getUserInfo] - no `USER_MANAGEMENT` needed, since the
     * class-level `isAuthenticated()` already covers it.
     */
    @GetMapping("/export", produces = ["application/zip"])
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
    @GetMapping("/{userId}/export", produces = ["application/zip"])
    @PreAuthorize("hasAuthority('USER_MANAGEMENT')")
    fun exportUserById(@PathVariable userId: Long): ResponseEntity<InputStreamResource> {
        val result = userExportService.exportUserById(userId)
            ?: throw NotFoundException("Benutzer (ID: $userId) nicht gefunden!")
        return exportResponse(result)
    }

    /**
     * The Art. 13 GDPR privacy notice for staff (GDPR gap G20, issue #3429) - what data is processed
     * about a staff member, and why, not the Art. 15/20 takeout [exportUser] already answers.
     * Generic and reference-less, same as `/households/privacy-notice-template`: `isAuthenticated()`
     * is enough, since nobody's personal data is involved. Reachable from the user menu (self-service)
     * and from the Mitarbeiter settings screen (for an admin to hand it to someone with no account).
     */
    @GetMapping("/privacy-notice-template", produces = [MediaType.APPLICATION_PDF_VALUE])
    fun generatePrivacyNoticeTemplate(): ResponseEntity<InputStreamResource> {
        val bytes = staffPrivacyNoticeService.generatePrivacyNoticePdf()
        val headers = ContentDispositionUtil.inline("datenschutzerklaerung-mitarbeiter.pdf")

        return ResponseEntity
            .ok()
            .headers(headers)
            .contentType(MediaType.APPLICATION_PDF)
            .body(InputStreamResource(ByteArrayInputStream(bytes)))
    }

    private fun exportResponse(result: UserExportFileResult): ResponseEntity<InputStreamResource> {
        val headers = ContentDispositionUtil.inline(result.filename)

        return ResponseEntity
            .ok()
            .headers(headers)
            .contentType(MediaType.valueOf("application/zip"))
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
        val authentication = SecurityContextHolder.getContext().authentication as TafelJwtAuthentication
        issueReplacementCookie(authentication.username!!, request, response, authentication.mfaVerified)

        return ResponseEntity.ok().build()
    }

    /**
     * Mints a fresh session cookie for [username], replacing the one the current request came in on.
     * Needed wherever a caller's own password is changed - [TafelUserDetailsManager.changePassword]/
     * `mapToUserEntity` invalidate every JWT issued for the account up to now (see
     * [TafelUserDetailsManager.markTokensInvalidated]), including the one carrying the request itself,
     * so without this the very next request would be an unexplained 401/logout despite the change
     * having succeeded (issue #3572).
     */
    private fun issueReplacementCookie(username: String, request: HttpServletRequest, response: HttpServletResponse, mfaVerified: Boolean) {
        val expirationTimeInSeconds = applicationProperties.security.jwtToken.expirationTimeInSeconds
        // The replacement keeps what the session it replaces had passed: a completed second factor is not
        // asked for again just because the password changed, and a session that never passed it does not
        // get to look as if it had.
        val token = jwtTokenService.generateToken(username = username, expirationSeconds = expirationTimeInSeconds, mfaVerified = mfaVerified)
        val cookie = TafelLoginFilter.createTokenCookie(token, expirationTimeInSeconds, tafelAdminProperties.server.relativeBaseUrl, request)
        response.addCookie(cookie)
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

    /**
     * A user-detail view (`GET /api/users/{id}`), read one account at a time - recorded as an
     * `AuditOperation.READ` for the same GDPR gap G11 breach detection as
     * `HouseholdService.findByHouseholdId` (issue #3430), now closed for a staff member's own
     * account data too (issue #3493). See `TafelUserDetailsManager.recordUserRead`.
     */
    @GetMapping("/{userId}")
    @PreAuthorize("hasAuthority('USER_MANAGEMENT')")
    @Transactional
    fun getUser(@PathVariable userId: Long): ResponseEntity<UserResponse> {
        val userDetails = userDetailsManager.loadUserById(userId)
            ?: throw NotFoundException("Benutzer (ID: $userId) nicht gefunden!")
        userDetailsManager.recordUserRead(userDetails)
        val user = mapToResponse(userDetails)
        return ResponseEntity.ok(user)
    }

    /** Same detail-view read as [getUser], reached by personnel number instead of id. */
    @GetMapping("/personnel-number/{personnelNumber}")
    @PreAuthorize("hasAuthority('USER_MANAGEMENT')")
    @Transactional
    fun getUserByPersonnelNumber(@PathVariable personnelNumber: String): ResponseEntity<UserResponse> {
        val userDetails = userDetailsManager.loadUserByPersonnelNumber(personnelNumber.trim())
            ?: throw NotFoundException("Benutzer (Personalnummer: $personnelNumber) nicht gefunden!")
        userDetailsManager.recordUserRead(userDetails)
        val user = mapToResponse(userDetails)
        return ResponseEntity.ok(user)
    }

    @PostMapping("/search")
    @PreAuthorize("hasAuthority('USER_MANAGEMENT')")
    fun searchUsers(@RequestBody request: UserSearchRequest): PagedResponse<UserResponse> {
        val userSearchResult = userDetailsManager.loadUsers(
            searchInput = request.searchInput,
            enabled = request.enabled,
            page = request.page,
            pageSize = request.pageSize,
            sortBy = request.sortBy,
            sortDirection = request.sortDirection,
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

        if (user.password != user.passwordRepeat) {
            throw BusinessRuleException("Passwörter stimmen nicht überein!")
        }

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
        request: HttpServletRequest,
        response: HttpServletResponse,
    ): ResponseEntity<UserResponse> {
        // The write below always targets the path id (see mapToTafelUser call), never a body one -
        // this only turns a body/path mismatch into an explicit error instead of a silent one, since
        // every existing caller submits the loaded user back and the two always agree.
        if (user.id != null && user.id != userId) {
            throw BusinessRuleException("Die ID im Request stimmt nicht mit der ID im Pfad überein!")
        }

        val existingUser = userDetailsManager.loadUserById(userId)
            ?: throw NotFoundException("Benutzer (ID: $userId) nicht vorhanden!")

        validateAdministratorAssignment(
            requested = user.permissions,
            current = existingUser.authorities.mapNotNull { it.authority },
        )
        validateAdministratorAccountFieldChanges(existingUser, user)
        // Revoking the permission and disabling the account are two ways of arriving at the same
        // place: an administrator who can no longer act.
        val keepsAdministrator = user.permissions.any { it.key == UserPermissions.ADMINISTRATOR.key } && user.enabled
        if (!keepsAdministrator) {
            validateNotLastAdministrator(userId, existingUser)
        }

        validatePersonnelNumberAvailable(user, excludedUserId = userId)

        if (user.password != user.passwordRepeat) {
            throw BusinessRuleException("Passwörter stimmen nicht überein!")
        }

        try {
            val updatedTafelUser = mapToTafelUser(user, id = userId)
            userDetailsManager.updateUser(updatedTafelUser)

            // A caller resetting their own password here (rather than through POST
            // /api/users/change-password) just invalidated every JWT issued for their account too
            // (see TafelUserDetailsManager.mapToUserEntity) - including the one this request came in
            // on - so the same replacement cookie changePassword mints has to happen here as well.
            // The username used is the just-persisted one, in case it changed in the same request.
            val authenticatedUser = SecurityContextHolder.getContext().authentication as? TafelJwtAuthentication
            val passwordChanged = !user.password.isNullOrBlank()
            if (authenticatedUser?.userId == userId && passwordChanged) {
                issueReplacementCookie(updatedTafelUser.username, request, response, authenticatedUser.mfaVerified)
            }

            val userResponse = mapToResponse(userDetailsManager.loadUserById(userId)!!)
            return ResponseEntity.ok(userResponse)
        } catch (e: PasswordChangeException) {
            throw BusinessRuleException(e.message)
        }
    }

    /**
     * Refuses a personnel number that already belongs to a *different* user account. Without this,
     * `TafelUserDetailsManager.resolveEmployee` would happily re-link [excludedUserId] onto that
     * other account's [at.wrk.tafel.admin.backend.database.model.base.EmployeeEntity] and overwrite
     * its name - `users.employee_id` is meant to be one-to-one (see `EmployeeService.deleteEmployee`'s
     * KDoc), and this is the update-time counterpart of [validateIfUserExists]'s create-time check.
     */
    private fun validatePersonnelNumberAvailable(user: UserRequest, excludedUserId: Long) {
        val ownerOfPersonnelNumber = userDetailsManager.loadUserByPersonnelNumber(user.personnelNumber)
        if (ownerOfPersonnelNumber != null && ownerOfPersonnelNumber.id != excludedUserId) {
            throw ConflictException("Benutzer (Personalnummer: ${user.personnelNumber}) existiert bereits!")
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

    /**
     * Switches two-factor authentication off for someone who lost their phone (see ADR-0058). Whoever
     * may hand out an account's permissions may do this, except for an administrator's own account -
     * removing the second factor there is as much a step towards taking it over as resetting its
     * password, which `validateAdministratorAccountFieldChanges` keeps to administrators as well.
     */
    @DeleteMapping("/{userId}/mfa")
    @PreAuthorize("hasAuthority('USER_MANAGEMENT')")
    @Transactional
    fun resetMfa(@PathVariable userId: Long): ResponseEntity<Unit> {
        val existingUser = userDetailsManager.loadUserById(userId)
            ?: throw NotFoundException("Benutzer (ID: $userId) nicht vorhanden!")

        val isTargetAdministrator = existingUser.authorities.any { it.authority == UserPermissions.ADMINISTRATOR.key }
        if (isTargetAdministrator) {
            val authenticatedUser = SecurityContextHolder.getContext().authentication as TafelJwtAuthentication
            if (authenticatedUser.authorities.none { it.authority == UserPermissions.ADMINISTRATOR.key }) {
                throw TafelApiException(
                    HttpStatus.FORBIDDEN,
                    "Die Zwei-Faktor-Authentifizierung eines Administrator-Kontos kann nur von einem Administrator zurückgesetzt werden!",
                )
            }
        }

        mfaService.reset(userId)
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

    @PostMapping("/login-attempts/search")
    @PreAuthorize("hasAuthority('USER_MANAGEMENT')")
    fun searchLoginAttempts(@RequestBody request: LoginAttemptSearchRequest): PagedResponse<LoginAttemptItem> {
        val pageRequest =
            PageRequest.of(PaginationDefaults.resolvePageIndex(request.page), PaginationDefaults.resolvePageSize(request.pageSize))
        val pagedResult = loginAttemptService.findAll(
            pageRequest = pageRequest,
            searchInput = request.searchInput,
            lockedOnly = request.lockedOnly ?: false,
            sortBy = request.sortBy,
            sortDirection = request.sortDirection,
        )

        return PagedResponse(
            items = pagedResult.content,
            totalCount = pagedResult.totalElements,
            currentPage = request.page ?: 1,
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

    private fun mapToTafelUser(user: UserRequest, id: Long? = user.id): TafelUser = TafelUser(
        id = id,
        username = user.username,
        personnelNumber = user.personnelNumber,
        firstname = user.firstname,
        lastname = user.lastname,
        email = user.email?.trim()?.takeIf { it.isNotEmpty() },
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
        email = user.email,
        enabled = user.isEnabled,
        password = null,
        passwordRepeat = null,
        passwordChangeRequired = user.passwordChangeRequired,
        permissions = user.authorities
            .filter { it.authority != null }
            .map { authority -> mapToUserPermission(authority.authority!!) }
            .sortedBy { it.title },
        lockedUntil = lockedUntil,
        mfaEnabled = user.mfaEnabled,
        mfaMethods = user.mfaMethods,
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
     * [validateAdministratorAssignment] only guards the ADMINISTRATOR flag itself - a caller
     * holding only `USER_MANAGEMENT` could otherwise leave that flag untouched and still reset an
     * administrator account's password or username, or force a password change on its next login,
     * which hands over the account just as completely as granting the permission outright would
     * (issue #3566). Refuses any of those three fields changing on a target that currently holds
     * ADMINISTRATOR unless the caller does too - the same "only an administrator may touch this"
     * rule, applied to the fields that let someone impersonate one instead of to the flag itself.
     */
    private fun validateAdministratorAccountFieldChanges(existingUser: TafelUser, requested: UserRequest) {
        val isTargetAdministrator = existingUser.authorities.any { it.authority == UserPermissions.ADMINISTRATOR.key }
        if (!isTargetAdministrator) {
            return
        }

        val authenticatedUser = SecurityContextHolder.getContext().authentication as TafelJwtAuthentication
        if (authenticatedUser.authorities.any { it.authority == UserPermissions.ADMINISTRATOR.key }) {
            return
        }

        val usernameChanged = requested.username != existingUser.username
        val passwordChanged = !requested.password.isNullOrBlank()
        val passwordChangeRequiredChanged = requested.passwordChangeRequired != existingUser.passwordChangeRequired
        if (usernameChanged || passwordChanged || passwordChangeRequiredChanged) {
            throw TafelApiException(
                HttpStatus.FORBIDDEN,
                "Benutzername, Passwort und die Passwortänderungs-Pflicht eines Administrator-Kontos " +
                    "können nur von einem Administrator geändert werden!",
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
     *
     * Takes LAST_ADMINISTRATOR_SAFEGUARD before checking: this is a check-then-act against the
     * count of enabled administrators, and without a lock two concurrent deletes/disables with
     * exactly two left could each see "another administrator exists" before either commits, and
     * both succeed - leaving zero (issue #3602). The lock is held until this call's own transaction
     * commits, so the next caller's count already reflects this one's outcome.
     */
    private fun validateNotLastAdministrator(userId: Long, existingUser: TafelUser) {
        val isActiveAdministrator = existingUser.enabled &&
            existingUser.authorities.any { it.authority == UserPermissions.ADMINISTRATOR.key }
        if (!isActiveAdministrator) {
            return
        }

        advisoryLockService.acquireLock(AdvisoryLockKey.LAST_ADMINISTRATOR_SAFEGUARD)
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
