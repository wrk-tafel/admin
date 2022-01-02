package at.wrk.tafel.admin.backend.security.components

import org.springframework.security.core.authority.SimpleGrantedAuthority
import org.springframework.security.core.userdetails.User
import org.springframework.security.core.userdetails.UserDetails
import org.springframework.security.core.userdetails.UserDetailsService
import org.springframework.security.provisioning.InMemoryUserDetailsManager
import org.springframework.stereotype.Component

@Component
class UserDetailsService : UserDetailsService {

    private val inMemoryUserDetailsManager = InMemoryUserDetailsManager()

    init {
        inMemoryUserDetailsManager.createUser(
            User(
                "javainuse", "$2a$10\$slYQmyNdGzTn7ZLBXBChFOC9f6kFjAqPhccnP6DxlWXx2lPk1C3G6",
                listOf()
            )
        )
        inMemoryUserDetailsManager.createUser(
            User(
                "checkin", "$2a$10\$slYQmyNdGzTn7ZLBXBChFOC9f6kFjAqPhccnP6DxlWXx2lPk1C3G6",
                listOf(SimpleGrantedAuthority("CHECKIN"))
            )
        )
    }

    override fun loadUserByUsername(username: String): UserDetails {
        return inMemoryUserDetailsManager.loadUserByUsername(username)
    }

}
