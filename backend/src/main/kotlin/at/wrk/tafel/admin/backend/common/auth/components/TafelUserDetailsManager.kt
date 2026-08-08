package at.wrk.tafel.admin.backend.common.auth.components

import at.wrk.tafel.admin.backend.common.ExcludeFromTestCoverage
import at.wrk.tafel.admin.backend.common.api.PaginationDefaults
import at.wrk.tafel.admin.backend.common.auth.model.TafelJwtAuthentication
import at.wrk.tafel.admin.backend.common.auth.model.TafelUser
import at.wrk.tafel.admin.backend.common.auth.model.UserPermissions
import at.wrk.tafel.admin.backend.config.properties.TafelAdminProperties
import at.wrk.tafel.admin.backend.database.common.search.SearchTextSpecs
import at.wrk.tafel.admin.backend.database.model.auth.UserAuthorityEntity
import at.wrk.tafel.admin.backend.database.model.auth.UserEntity
import at.wrk.tafel.admin.backend.database.model.auth.UserEntity.Specs.Companion.enabledEquals
import at.wrk.tafel.admin.backend.database.model.auth.UserEntity.Specs.Companion.orderBySearchRelevance
import at.wrk.tafel.admin.backend.database.model.auth.UserEntity.Specs.Companion.searchTextMatches
import at.wrk.tafel.admin.backend.database.model.auth.UserRepository
import at.wrk.tafel.admin.backend.database.model.base.EmployeeEntity
import at.wrk.tafel.admin.backend.database.model.base.EmployeeRepository
import org.passay.PasswordData
import org.passay.PasswordValidator
import org.passay.ValidationResult
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

class TafelUserDetailsManager(
    private val userRepository: UserRepository,
    private val employeeRepository: EmployeeRepository,
    private val passwordEncoder: PasswordEncoder,
    private val passwordValidator: PasswordValidator,
    private val tafelAdminProperties: TafelAdminProperties,
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
     * Whether anyone other than [excludedUserId] would still be an administrator able to log in.
     * Used to keep the last one from being removed - see `UserController`.
     */
    fun anotherEnabledAdministratorExists(excludedUserId: Long): Boolean = userRepository.countOtherEnabledUsersWithAuthority(UserPermissions.ADMINISTRATOR.key, excludedUserId) > 0

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

    override fun deleteUser(username: String) {
        val userEntity =
            userRepository.findByUsername(username) ?: throw UsernameNotFoundException("Username not found")
        userRepository.delete(userEntity)
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
            userRepository.save(storedUser)
        }
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
            else -> null
        }
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
