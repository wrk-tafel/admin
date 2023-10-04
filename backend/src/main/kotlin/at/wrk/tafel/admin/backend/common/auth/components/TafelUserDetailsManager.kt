package at.wrk.tafel.admin.backend.common.auth.components

import at.wrk.tafel.admin.backend.common.auth.model.TafelJwtAuthentication
import at.wrk.tafel.admin.backend.common.auth.model.TafelUser
import at.wrk.tafel.admin.backend.database.entities.auth.UserAuthorityEntity
import at.wrk.tafel.admin.backend.database.entities.auth.UserEntity
import at.wrk.tafel.admin.backend.database.repositories.auth.UserRepository
import org.passay.DictionarySubstringRule
import org.passay.LengthRule
import org.passay.PasswordData
import org.passay.PasswordValidator
import org.passay.RuleResult
import org.passay.UsernameRule
import org.passay.WhitespaceRule
import org.springframework.security.core.authority.SimpleGrantedAuthority
import org.springframework.security.core.context.SecurityContextHolder
import org.springframework.security.core.userdetails.UserDetails
import org.springframework.security.core.userdetails.UsernameNotFoundException
import org.springframework.security.crypto.password.PasswordEncoder
import org.springframework.security.provisioning.UserDetailsManager

class TafelUserDetailsManager(
    private val userRepository: UserRepository,
    private val passwordEncoder: PasswordEncoder,
    private val passwordValidator: PasswordValidator
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
        val user = userRepository.findByPersonnelNumber(personnelNumber)
        return user?.let { mapToUserDetails(user) }
    }

    fun loadUsers(firstname: String?, lastname: String?): List<TafelUser> {
        val users = if (firstname?.isNotBlank() == true && lastname?.isNotBlank() == true) {
            userRepository.findAllByFirstnameContainingIgnoreCaseOrLastnameContainingIgnoreCase(
                firstname,
                lastname
            )
        } else if (firstname?.isNotBlank() == true) {
            userRepository.findAllByFirstnameContainingIgnoreCase(firstname)
        } else if (lastname?.isNotBlank() == true) {
            userRepository.findAllByLastnameContainingIgnoreCase(lastname)
        } else {
            userRepository.findAll()
        }
        return users.map { mapToUserDetails(it) }
    }

    override fun createUser(user: UserDetails?) {
        val tafelUser = user as TafelUser

        val userEntity = UserEntity()
        mapToUserEntity(userEntity, tafelUser)
        userRepository.save(userEntity)
    }

    override fun updateUser(user: UserDetails) {
        val tafelUser = user as TafelUser

        val userEntity: UserEntity = userRepository.findById(user.id).get()
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
        if (result.isValid) {
            return true
        } else {
            throw PasswordChangeException("Das neue Passwort ist ungültig!", translateViolationsToMessages(result))
        }
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
            personnelNumber = userEntity.personnelNumber!!,
            firstname = userEntity.firstname!!,
            lastname = userEntity.lastname!!,
            authorities = userEntity.authorities.map { SimpleGrantedAuthority(it.name) },
            passwordChangeRequired = userEntity.passwordChangeRequired!!
        )
    }

    private fun mapToUserEntity(userEntity: UserEntity, tafelUser: TafelUser) {
        userEntity.personnelNumber = tafelUser.personnelNumber
        userEntity.username = tafelUser.username
        userEntity.firstname = tafelUser.firstname
        userEntity.lastname = tafelUser.lastname
        userEntity.enabled = tafelUser.enabled
        val newPassword = tafelUser.password
        if (newPassword != null && isPasswordValid(tafelUser.username, newPassword)) {
            userEntity.password = passwordEncoder.encode(newPassword)
        }
        userEntity.passwordChangeRequired = tafelUser.passwordChangeRequired

        userEntity.authorities.clear()
        userEntity.authorities.addAll(
            tafelUser.authorities.map {
                val authorityEntity = UserAuthorityEntity()
                authorityEntity.user = userEntity
                authorityEntity.name = it.authority
                authorityEntity
            }.toMutableList()
        )
    }

}

class PasswordChangeException(override val message: String, val validationDetails: List<String>? = emptyList()) :
    RuntimeException(message)
