package at.wrk.tafel.admin.backend.security.components

import org.springframework.security.core.userdetails.User
import org.springframework.security.core.userdetails.UserDetails
import org.springframework.security.core.userdetails.UserDetailsService
import org.springframework.security.core.userdetails.UsernameNotFoundException
import org.springframework.stereotype.Service

@Service
class JwtUserDetailsService : UserDetailsService {

    override fun loadUserByUsername(username: String): UserDetails {
        return if ("javainuse" == username) {
            User(
                "javainuse", "$2a$10\$slYQmyNdGzTn7ZLBXBChFOC9f6kFjAqPhccnP6DxlWXx2lPk1C3G6",
                ArrayList()
            )
        } else {
            throw UsernameNotFoundException("User not found with username: $username")
        }
    }

}
