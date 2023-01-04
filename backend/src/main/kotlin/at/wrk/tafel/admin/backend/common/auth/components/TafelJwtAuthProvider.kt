package at.wrk.tafel.admin.backend.common.auth.components

import org.springframework.security.authentication.AuthenticationProvider
import org.springframework.security.core.Authentication

class TafelJwtAuthProvider : AuthenticationProvider {

    override fun authenticate(authentication: Authentication): Authentication {
        TODO("Not yet implemented")
    }

    override fun supports(authentication: Class<*>?): Boolean {
        TODO("Not yet implemented")
    }

}
