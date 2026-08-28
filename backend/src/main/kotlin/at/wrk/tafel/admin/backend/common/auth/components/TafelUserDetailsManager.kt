package at.wrk.tafel.admin.backend.common.auth.components

import at.wrk.tafel.admin.backend.common.ExcludeFromTestCoverage
import at.wrk.tafel.admin.backend.common.api.PaginationDefaults
import at.wrk.tafel.admin.backend.common.auth.model.TafelJwtAuthentication
import at.wrk.tafel.admin.backend.common.auth.model.TafelUser
import at.wrk.tafel.admin.backend.common.auth.model.UserPermissions
import at.wrk.tafel.admin.backend.config.properties.TafelAdminProperties
import at.wrk.tafel.admin.backend.database.common.audit.AuditActorProvider
import at.wrk.tafel.admin.backend.database.common.audit.AuditLogWriter
import at.wrk.tafel.admin.backend.database.common.audit.AuditOperation
import at.wrk.tafel.admin.backend.database.common.search.SearchTextSpecs
import at.wrk.tafel.admin.backend.database.model.audit.AuditLogRepository
import at.wrk.tafel.admin.backend.database.model.auth.UserAuthorityEntity
import at.wrk.tafel.admin.backend.database.model.auth.UserEntity
import at.wrk.tafel.admin.backend.database.model.auth.UserEntity.Specs.Companion.enabledEquals
import at.wrk.tafel.admin.backend.database.model.auth.UserEntity.Specs.Companion.orderBySearchRelevance
import at.wrk.tafel.admin.backend.database.model.auth.UserEntity.Specs.Companion.searchTextMatches
import at.wrk.tafel.admin.backend.database.model.auth.UserRepository
import at.wrk.tafel.admin.backend.database.model.base.EmployeeEntity
import at.wrk.tafel.admin.backend.database.model.base.EmployeeRepository
import at.wrk.tafel.admin.backend.modules.base.exception.ConflictException
import org.passay.PasswordData
import org.passay.PasswordValidator
import org.passay.ValidationResult
import org.passay.data.EnglishCharacterData
import org.passay.data.GermanCharacterData
import org.passay.rule.CharacterCharacteristicsRule
import org.passay.rule.DictionarySubstringRule
import org.passay.rule.LengthRule
import org.passay.rule.UsernameRule
import org.passay.rule.WhitespaceRule
import org.springframework.data.domain.PageRequest
import org.springframework.data.jpa.domain.Specification
import org.springframework.data.jpa.domain.Specification.where
import org.springframework.security.core.authority.SimpleGrantedAuthority
import org.springframework.security.core.context.SecurityContextHolder
import org.springframework.security.core.userdetails.UserDetails
import org.springframework.security.core.userdetails.UsernameNotFoundException
import org.springframework.security.crypto.password.PasswordEncoder
import org.springframework.security.provisioning.UserDetailsManager
import java.time.Clock
import java.time.LocalDateTime

class TafelUserDetailsManager(
    private val userRepository: UserRepository,
    private val employeeRepository: EmployeeRepository,
    private val passwordEncoder: PasswordEncoder,
    private val passwordValidator: PasswordValidator,
    private val tafelAdminProperties: TafelAdminProperties,
    private val loginAttemptService: LoginAttemptService,
    private val auditLogWriter: AuditLogWriter,
    private val auditLogRepository: AuditLogRepository,
    private val auditActorProvider: AuditActorProvider,
    private val clock: Clock,
) : UserDetailsManager {

    fun loadUserById(userId: Long): TafelUser? = userRepository.findById(userId)
        .map { userEntity -> mapToUserDetails(userEntity) }
        .orElse(null)

    override fun loadUserByUsername(username: String): TafelUser {
        val user = userRepository.findByUsername(username) ?: throw UsernameNotFoundException("Username not found")
        return mapToUserDetails(user)
    }

    fun loadUserByPersonnelNumber(personnelNumber: String): TafelUser? {
        val user = userRepository.findByEmployeePersonnelNumber(personnelNumber)
        return user?.let { mapToUserDetails(user) }
    }

    /**
     * A user-detail view (`UserController.getUser`/`getUserByPersonnelNumber`) being read one
     * account at a time - recorded as an `AuditOperation.READ` for the same GDPR gap G11 breach
     * detection as `HouseholdService.findByHouseholdId` (issue #3430), now closed for a staff
     * member's own account data too (issue #3493). Mirrors `recordHouseholdRead` there: entity type
     * `"User"` (the same type `UserEntity`'s own insert/update/delete entries use) and `businessKey`
     * the viewed username, de-duplicated per actor+user within `tafeladmin.audit.readDedupeWindow`
     * so reloading the same screen isn't counted as a fresh read. Deliberately not folded into
     * [loadUserById]/[loadUserByPersonnelNumber] themselves - those are also called by write flows
     * (update/delete/export) that must not each count as a read.
     */
    fun recordUserRead(user: TafelUser) {
        val actorUsername = auditActorProvider.currentUsername() ?: return
        val businessKey = user.username
        val since = LocalDateTime.now(clock).minus(tafelAdminProperties.audit.readDedupeWindow)
        val alreadyRecorded = auditLogRepository.existsByEntityTypeAndBusinessKeyAndOperationAndActorUsernameAndOccurredAtAfter(
            "User",
            businessKey,
            AuditOperation.READ,
            actorUsername,
            since,
        )
        if (alreadyRecorded) {
            return
        }

        auditLogWriter.record(
            AuditLogWriter.PendingEntry(
                entityType = "User",
                entityId = user.id,
                businessKey = businessKey,
                operation = AuditOperation.READ,
                changedFields = emptyMap(),
            ),
        )
    }

    /**
     * Whether anyone other than [excludedUserId] would still be an administrator able to log in.
     * Used to keep the last one from being removed - see `UserController`.
     */
    fun anotherEnabledAdministratorExists(excludedUserId: Long): Boolean = userRepository.countOtherEnabledUsersWithAuthority(UserPermissions.ADMINISTRATOR.key, excludedUserId) > 0

    /**
     * Deletes a user by id, refusing to remove the last active administrator - the same invariant
     * `UserController.deleteUser` enforces for its own delete path, re-checked here since the
     * central data-subject-request screen (issue #3396) is a second caller of `deleteUser` that must
     * not be able to bypass it. Returns `false` rather than throwing when the user no longer exists,
     * so a caller acting on a stale search result can treat it the same as "already gone".
     */
    fun deleteUserById(userId: Long): Boolean {
        val tafelUser = loadUserById(userId) ?: return false

        val isActiveAdministrator = tafelUser.enabled &&
            tafelUser.authorities.any { it.authority == UserPermissions.ADMINISTRATOR.key }
        if (isActiveAdministrator && !anotherEnabledAdministratorExists(userId)) {
            throw ConflictException(
                "Es muss mindestens ein aktiver Benutzer mit der Berechtigung \"${UserPermissions.ADMINISTRATOR.title}\" verbleiben!",
            )
        }

        deleteUser(tafelUser.username)
        return true
    }

    fun loadUsers(
        searchInput: String?,
        enabled: Boolean?,
        page: Int?,
        pageSize: Int? = null,
    ): UserSearchResult {
        val pageRequest = PageRequest.of(page?.minus(1) ?: 0, PaginationDefaults.resolvePageSize(pageSize))
        val searchTerm = SearchTextSpecs.normalize(searchInput)

        val spec = orderBySearchRelevance(
            searchTerm,
            where(
                Specification.allOf(
                    listOf(
                        searchTextMatches(searchTerm, tafelAdminProperties.search.similarityThreshold),
                        enabledEquals(enabled),
                    ).mapNotNull { it },
                ),
            ),
        )
        val pagedResult = userRepository.findAll(spec, pageRequest)

        return UserSearchResult(
            items = pagedResult.map { mapToUserDetails(it) }.toList(),
            totalCount = pagedResult.totalElements,
            currentPage = page ?: 1,
            totalPages = pagedResult.totalPages,
            pageSize = pageRequest.pageSize,
        )
    }

    override fun createUser(user: UserDetails) {
        val tafelUser = user as TafelUser
        val newPassword: String = tafelUser.password ?: throw PasswordChangeException("Passwort ist erforderlich!")
        isPasswordValid(tafelUser.username, newPassword)

        val userEntity = UserEntity(
            username = tafelUser.username,
            password = passwordEncoder.encode(newPassword)!!,
            employee = resolveEmployee(tafelUser),
            enabled = tafelUser.enabled,
            passwordChangeRequired = tafelUser.passwordChangeRequired,
        )
        syncAuthorities(userEntity, tafelUser)
        userRepository.save(userEntity)
    }

    override fun updateUser(user: UserDetails) {
        val tafelUser = user as TafelUser

        val userEntity: UserEntity = userRepository.getReferenceById(user.id!!)
        mapToUserEntity(userEntity, tafelUser)
        userRepository.save(userEntity)
    }

    /**
     * Deletes the account. Every `created_by`/`updated_by` change-tracking actor elsewhere in the
     * database (issue #3426) is a foreign key to `users(id)` with `on delete set null`
     * (`R__00111_change_tracking_actor_user_fk.sql`, ADR-0052), so deleting the row here clears them
     * by itself - no separate sweep needed.
     */
    override fun deleteUser(username: String) {
        val userEntity =
            userRepository.findByUsername(username) ?: throw UsernameNotFoundException("Username not found")
        userRepository.delete(userEntity)
        // login_attempts is keyed by username, not a FK to users - clear it explicitly rather than
        // waiting for LoginAttemptService.cleanupStaleEntries to age it out.
        loginAttemptService.deleteAttempts(username)
    }

    override fun changePassword(oldPassword: String?, newPassword: String?) {
        if (oldPassword == null || newPassword == null) {
            throw PasswordChangeException("Aktuelles Passwort ist falsch!")
        }

        val authenticatedUser = SecurityContextHolder.getContext().authentication as TafelJwtAuthentication
        var storedUser = userRepository.findByUsername(authenticatedUser.username!!)!!

        if (!passwordEncoder.matches(oldPassword, storedUser.password)) {
            throw PasswordChangeException("Aktuelles Passwort ist falsch!")
        }

        if (isPasswordValid(storedUser.username, newPassword)) {
            storedUser.password = passwordEncoder.encode(newPassword)!!
            storedUser.passwordChangeRequired = false
            markTokensInvalidated(storedUser)
            userRepository.save(storedUser)
        }
    }

    /**
     * Bumps [UserEntity.tokenInvalidatedAt] to now, so [TafelJwtAuthProvider] rejects every JWT
     * issued for this user before this moment on their very next request. Called wherever a
     * password is changed - here and from [mapToUserEntity] - and, separately, from
     * [invalidateTokens] on logout. Does not save; callers already persist [userEntity] themselves.
     */
    private fun markTokensInvalidated(userEntity: UserEntity) {
        userEntity.tokenInvalidatedAt = LocalDateTime.now()
    }

    /**
     * Logout only ever clears the cookie client-side otherwise, so the JWT it carried - and any
     * other still-live token for the same user, since a JWT carries no session id to invalidate just
     * the one - would keep authenticating for the rest of its lifetime. Called from
     * `UserController.logout`.
     */
    fun invalidateTokens(username: String) {
        val userEntity = userRepository.findByUsername(username) ?: return
        markTokensInvalidated(userEntity)
        userRepository.save(userEntity)
    }

    private fun isPasswordValid(username: String, newPassword: String): Boolean {
        val data = PasswordData(username, newPassword)
        val result = passwordValidator.validate(data)
        if (!result.isValid) {
            throw PasswordChangeException("Das neue Passwort ist ungültig!", translateViolationsToMessages(result))
        }
        return true
    }

    private fun translateViolationsToMessages(result: ValidationResult): List<String> = result.details.mapNotNull {
        when (it.errorCode) {
            LengthRule.ERROR_CODE_MIN -> """Mindestlänge: ${it.parameters["minimumLength"]}, Maximale Länge: ${it.parameters["maximumLength"]}"""
            LengthRule.ERROR_CODE_MAX -> """Mindestlänge: ${it.parameters["minimumLength"]}, Maximale Länge: ${it.parameters["maximumLength"]}"""
            WhitespaceRule.ERROR_CODE -> """Leerzeichen sind nicht erlaubt"""
            UsernameRule.ERROR_CODE, UsernameRule.ERROR_CODE_REVERSED -> "Der Benutzername darf nicht Teil des Passworts sein"
            DictionarySubstringRule.ERROR_CODE, DictionarySubstringRule.ERROR_CODE_REVERSED -> "Folgende Wörter dürfen nicht enhalten sein: ${it.parameters["matchingWord"]}"
            GermanCharacterData.LowerCase.errorCode -> "Muss mindestens einen Kleinbuchstaben enthalten"
            GermanCharacterData.UpperCase.errorCode -> "Muss mindestens einen Großbuchstaben enthalten"
            EnglishCharacterData.Digit.errorCode -> "Muss mindestens eine Ziffer enthalten"
            // the individual character-class messages above already say what's missing - this
            // aggregate detail (CharacterCharacteristicsRule always reports both) would only repeat it
            CharacterCharacteristicsRule.ERROR_CODE -> null
            else -> null
        }
    }

    /**
     * Re-persists [username]'s password hash as [upgradedHash], with no re-validation of the
     * password itself - [TafelLoginProvider] calls this right after a successful login whose
     * stored hash was produced with older Argon2 parameters than [PasswordEncoder] is currently
     * configured with, so an existing user migrates onto the current parameters on their next
     * login rather than needing a bulk rehash or a forced password reset.
     */
    fun upgradePasswordHash(username: String, upgradedHash: String) {
        val userEntity = userRepository.findByUsername(username) ?: return
        userEntity.password = upgradedHash
        userRepository.save(userEntity)
    }

    override fun userExists(username: String): Boolean = userRepository.existsByUsername(username)

    private fun mapToUserDetails(userEntity: UserEntity): TafelUser = TafelUser(
        id = userEntity.id!!,
        username = userEntity.username,
        password = userEntity.password,
        enabled = userEntity.enabled,
        personnelNumber = userEntity.employee.personnelNumber,
        firstname = userEntity.employee.firstname,
        lastname = userEntity.employee.lastname,
        authorities = userEntity.authorities.map { SimpleGrantedAuthority(it.name) },
        passwordChangeRequired = userEntity.passwordChangeRequired,
    )

    private fun resolveEmployee(tafelUser: TafelUser): EmployeeEntity {
        val existingEmployee = employeeRepository.findByPersonnelNumber(tafelUser.personnelNumber)
        return if (existingEmployee != null) {
            existingEmployee.apply {
                personnelNumber = tafelUser.personnelNumber
                firstname = tafelUser.firstname
                lastname = tafelUser.lastname
            }
        } else {
            EmployeeEntity(
                personnelNumber = tafelUser.personnelNumber,
                firstname = tafelUser.firstname,
                lastname = tafelUser.lastname,
            )
        }
    }

    /**
     * Diffs `userEntity.authorities` against `tafelUser.authorities` (remove-then-add) instead of
     * replacing the collection outright, because JPA's `orphanRemoval` on that relation only
     * deletes stale [UserAuthorityEntity] rows when they're mutated out of the existing managed
     * collection - swapping in a brand-new list would leave the old rows orphaned in the DB rather
     * than removed.
     */
    private fun syncAuthorities(userEntity: UserEntity, tafelUser: TafelUser) {
        // remove old permissions
        userEntity.authorities.removeIf { authorityEntity ->
            !tafelUser.authorities.map { it.authority!! }.contains(authorityEntity.name)
        }

        // add new permissions
        val currentAuthorities = userEntity.authorities.map { it.name }
        val newAuthorities = tafelUser.authorities.map { it.authority!! } - currentAuthorities.toSet()
        userEntity.authorities.addAll(
            newAuthorities.map { name -> UserAuthorityEntity(user = userEntity, name = name) }.toMutableList(),
        )
    }

    private fun mapToUserEntity(userEntity: UserEntity, tafelUser: TafelUser) {
        userEntity.employee = resolveEmployee(tafelUser)
        userEntity.username = tafelUser.username
        userEntity.enabled = tafelUser.enabled
        val newPassword = tafelUser.password
        if (newPassword != null && isPasswordValid(tafelUser.username, newPassword)) {
            userEntity.password = passwordEncoder.encode(newPassword)!!
            markTokensInvalidated(userEntity)
        }
        userEntity.passwordChangeRequired = tafelUser.passwordChangeRequired

        syncAuthorities(userEntity, tafelUser)
    }
}

class PasswordChangeException(override val message: String, val validationDetails: List<String>? = emptyList()) : RuntimeException(message)

@ExcludeFromTestCoverage
data class UserSearchResult(
    val items: List<TafelUser>,
    val totalCount: Long,
    val currentPage: Int,
    val totalPages: Int,
    val pageSize: Int,
)
