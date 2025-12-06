package at.wrk.tafel.admin.backend.common.auth.components

import at.wrk.tafel.admin.backend.common.ExcludeFromTestCoverage
import at.wrk.tafel.admin.backend.common.auth.model.TafelJwtAuthentication
import at.wrk.tafel.admin.backend.common.auth.model.TafelUser
import at.wrk.tafel.admin.backend.database.model.auth.UserAuthorityEntity
import at.wrk.tafel.admin.backend.database.model.auth.UserEntity
import at.wrk.tafel.admin.backend.database.model.auth.UserEntity.Specs.Companion.enabledEquals
import at.wrk.tafel.admin.backend.database.model.auth.UserEntity.Specs.Companion.firstnameContains
import at.wrk.tafel.admin.backend.database.model.auth.UserEntity.Specs.Companion.lastnameContains
import at.wrk.tafel.admin.backend.database.model.auth.UserEntity.Specs.Companion.orderByUpdatedAtDesc
import at.wrk.tafel.admin.backend.database.model.auth.UserEntity.Specs.Companion.usernameContains
import at.wrk.tafel.admin.backend.database.model.auth.UserRepository
import at.wrk.tafel.admin.backend.database.model.base.EmployeeEntity
import at.wrk.tafel.admin.backend.database.model.base.EmployeeRepository
import org.passay.*
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
) : UserDetailsManager {

    fun loadUserById(userId: Long): TafelUser? {
        return userRepository.findById(userId)
            .map { userEntity -> mapToUserDetails(userEntity) }
            .orElse(null)
    }

    override fun loadUserByUsername(username: String): TafelUser {
        val user = userRepository.findByUsername(username) ?: throw UsernameNotFoundException("Username not found")
        return mapToUserDetails(user)
    }

    fun loadUserByPersonnelNumber(personnelNumber: String): TafelUser? {
        val user = userRepository.findByEmployeePersonnelNumber(personnelNumber)
        return user?.let { mapToUserDetails(user) }
    }

    fun loadUsers(
        username: String?,
        firstname: String?,
        lastname: String?,
        enabled: Boolean?,
        page: Int?,
    ): UserSearchResult {
        val pageRequest = PageRequest.of(page?.minus(1) ?: 0, 25)

        val spec = orderByUpdatedAtDesc(
            where(
                Specification.allOf(
                    listOf(
                        usernameContains(username),
                        firstnameContains(firstname),
                        lastnameContains(lastname),
                        enabledEquals(enabled)
                    ).mapNotNull { it }
                )
            )
        )
        val pagedResult = userRepository.findAll(spec, pageRequest)

        return UserSearchResult(
            items = pagedResult.map { mapToUserDetails(it) }.toList(),
            totalCount = pagedResult.totalElements,
            currentPage = page ?: 1,
            totalPages = pagedResult.totalPages,
            pageSize = pageRequest.pageSize
        )
    }

    override fun createUser(user: UserDetails) {
        val tafelUser = user as TafelUser

        val userEntity = UserEntity()
        mapToUserEntity(userEntity, tafelUser)
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

    override fun changePassword(currentPassword: String, newPassword: String) {
        val authenticatedUser = SecurityContextHolder.getContext().authentication as TafelJwtAuthentication
        var storedUser = userRepository.findByUsername(authenticatedUser.username!!)!!

        if (!passwordEncoder.matches(currentPassword, storedUser.password)) {
            throw PasswordChangeException("Aktuelles Passwort ist falsch!")
        }

        if (isPasswordValid(storedUser.username!!, newPassword)) {
            storedUser.password = passwordEncoder.encode(newPassword)
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

    private fun translateViolationsToMessages(result: RuleResult): List<String> {
        return result.details.mapNotNull {
            when (it.errorCode) {
                LengthRule.ERROR_CODE_MIN -> """Mindestlänge: ${it.parameters["minimumLength"]}, Maximale Länge: ${it.parameters["maximumLength"]}"""
                LengthRule.ERROR_CODE_MAX -> """Mindestlänge: ${it.parameters["minimumLength"]}, Maximale Länge: ${it.parameters["maximumLength"]}"""
                WhitespaceRule.ERROR_CODE -> """Leerzeichen sind nicht erlaubt"""
                UsernameRule.ERROR_CODE, UsernameRule.ERROR_CODE_REVERSED -> "Der Benutzername darf nicht Teil des Passworts sein"
                DictionarySubstringRule.ERROR_CODE, DictionarySubstringRule.ERROR_CODE_REVERSED -> "Folgende Wörter dürfen nicht enhalten sein: ${it.parameters["matchingWord"]}"
                else -> null
            }
        }
    }

    override fun userExists(username: String): Boolean = userRepository.existsByUsername(username)

    // TODO this could be reduced after the new security mechanism is implemented
    private fun mapToUserDetails(userEntity: UserEntity): TafelUser {
        return TafelUser(
            id = userEntity.id!!,
            username = userEntity.username!!,
            password = userEntity.password!!,
            enabled = userEntity.enabled!!,
            personnelNumber = userEntity.employee!!.personnelNumber!!,
            firstname = userEntity.employee!!.firstname!!,
            lastname = userEntity.employee!!.lastname!!,
            authorities = userEntity.authorities.filter { it.name != null }.map { SimpleGrantedAuthority(it.name!!) },
            passwordChangeRequired = userEntity.passwordChangeRequired!!
        )
    }

    private fun mapToUserEntity(userEntity: UserEntity, tafelUser: TafelUser) {
        val existingEmployee = employeeRepository.findByPersonnelNumber(tafelUser.personnelNumber) ?: EmployeeEntity()

        userEntity.employee = existingEmployee.apply {
            personnelNumber = tafelUser.personnelNumber
            firstname = tafelUser.firstname
            lastname = tafelUser.lastname
        }
        userEntity.username = tafelUser.username
        userEntity.enabled = tafelUser.enabled
        val newPassword = tafelUser.password
        if (newPassword != null && isPasswordValid(tafelUser.username, newPassword)) {
            userEntity.password = passwordEncoder.encode(newPassword)
        }
        userEntity.passwordChangeRequired = tafelUser.passwordChangeRequired

        // remove old permissions
        userEntity.authorities.removeIf { authorityEntity ->
            !tafelUser.authorities.map { it.authority }.contains(authorityEntity.name)
        }

        // add new permissions
        val currentAuthorities = userEntity.authorities.map { it.name }
        val newAuthorities = tafelUser.authorities.map { it.authority } - currentAuthorities.toSet()
        userEntity.authorities.addAll(
            newAuthorities.map { name ->
                val userAuthorityEntity = UserAuthorityEntity()
                userAuthorityEntity.user = userEntity
                userAuthorityEntity.name = name
                userAuthorityEntity
            }.toMutableList()
        )
    }

}

class PasswordChangeException(override val message: String, val validationDetails: List<String>? = emptyList()) :
    RuntimeException(message)

@ExcludeFromTestCoverage
data class UserSearchResult(
    val items: List<TafelUser>,
    val totalCount: Long,
    val currentPage: Int,
    val totalPages: Int,
    val pageSize: Int,
)
