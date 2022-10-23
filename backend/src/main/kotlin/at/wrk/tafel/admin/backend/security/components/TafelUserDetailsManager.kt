package at.wrk.tafel.admin.backend.security.components

import at.wrk.tafel.admin.backend.database.entities.auth.UserEntity
import at.wrk.tafel.admin.backend.database.repositories.auth.UserRepository
import at.wrk.tafel.admin.backend.security.model.TafelUser
import org.passay.PasswordData
import org.passay.PasswordValidator
import org.springframework.security.core.authority.SimpleGrantedAuthority
import org.springframework.security.core.context.SecurityContextHolder
import org.springframework.security.core.userdetails.UserDetails
import org.springframework.security.crypto.password.PasswordEncoder
import org.springframework.security.provisioning.UserDetailsManager

class TafelUserDetailsManager(
    private val userRepository: UserRepository,
    private val passwordEncoder: PasswordEncoder,
    private val passwordValidator: PasswordValidator
) : UserDetailsManager {

    override fun loadUserByUsername(username: String): UserDetails? {
        return userRepository.findByUsername(username)
            .map { userEntity -> mapToUserDetails(userEntity) }
            .orElse(null)
    }

    override fun createUser(user: UserDetails?) {
        TODO("Not yet implemented")
    }

    override fun updateUser(user: UserDetails?) {
        TODO("Not yet implemented")
    }

    override fun deleteUser(username: String?) {
        TODO("Not yet implemented")
    }

    override fun changePassword(oldPassword: String, newPassword: String) {
        val authenticatedUser = SecurityContextHolder.getContext().authentication.principal as TafelUser
        var storedUser = userRepository.findByUsername(authenticatedUser.username).get()

        if (!passwordEncoder.matches(oldPassword, storedUser.password)) {
            throw PasswordException("Passwörter stimmen nicht überein!")
        }

        val data = PasswordData(storedUser.username, newPassword)
        val result = passwordValidator.validate(data)
        if (!result.isValid) {
            // TODO map validation details
            throw PasswordException("Neues Passwort ist ungültig!", emptyList())
        } else {
            storedUser.password = passwordEncoder.encode(newPassword)
            userRepository.save(storedUser)
        }
    }

    override fun userExists(username: String): Boolean = userRepository.existsByUsername(username)

    private fun mapToUserDetails(userEntity: UserEntity): TafelUser {
        return TafelUser(
            username = userEntity.username!!,
            password = userEntity.password!!,
            enabled = userEntity.enabled!!,
            id = userEntity.id!!,
            personnelNumber = userEntity.personnelNumber!!,
            firstname = userEntity.firstname!!,
            lastname = userEntity.lastname!!,
            authorities = userEntity.authorities.map { SimpleGrantedAuthority(it.name) }
        )
    }

}

class PasswordException(override val message: String, val validationDetails: List<String>? = emptyList()) :
    RuntimeException(message)
