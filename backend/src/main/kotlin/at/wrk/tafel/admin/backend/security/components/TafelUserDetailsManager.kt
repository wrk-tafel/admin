package at.wrk.tafel.admin.backend.security.components

import at.wrk.tafel.admin.backend.database.entities.auth.UserEntity
import at.wrk.tafel.admin.backend.database.repositories.UserRepository
import at.wrk.tafel.admin.backend.security.model.TafelUser
import org.springframework.security.core.authority.SimpleGrantedAuthority
import org.springframework.security.core.userdetails.UserDetails
import org.springframework.security.provisioning.UserDetailsManager

class TafelUserDetailsManager(
    private val userRepository: UserRepository
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

    override fun changePassword(oldPassword: String?, newPassword: String?) {
        TODO("Not yet implemented")
    }

    override fun userExists(username: String): Boolean = userRepository.existsByUsername(username)

    private fun mapToUserDetails(userEntity: UserEntity): TafelUser {
        return TafelUser(
            username = userEntity.username!!,
            password = userEntity.password!!,
            enabled = userEntity.enabled!!,
            personnelNumber = userEntity.personnelNumber!!,
            firstname = userEntity.firstname!!,
            lastname = userEntity.lastname!!,
            authorities = userEntity.authorities.map { SimpleGrantedAuthority(it.name) }
        )
    }

}
