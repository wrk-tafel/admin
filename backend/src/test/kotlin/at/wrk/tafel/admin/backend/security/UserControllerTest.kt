package at.wrk.tafel.admin.backend.security

import at.wrk.tafel.admin.backend.security.model.ChangePasswordRequest
import io.mockk.impl.annotations.InjectMockKs
import io.mockk.impl.annotations.RelaxedMockK
import io.mockk.junit5.MockKExtension
import io.mockk.verify
import org.assertj.core.api.Assertions.assertThat
import org.junit.jupiter.api.Assertions.*
import org.junit.jupiter.api.Test
import org.junit.jupiter.api.extension.ExtendWith
import org.springframework.http.HttpStatus
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken
import org.springframework.security.core.context.SecurityContextHolder
import org.springframework.security.provisioning.UserDetailsManager

@ExtendWith(MockKExtension::class)
class UserControllerTest {

    @RelaxedMockK
    private lateinit var userDetailsManager: UserDetailsManager

    @InjectMockKs
    private lateinit var controller: UserController

    @Test
    fun `changed password`() {
        SecurityContextHolder.getContext().authentication = UsernamePasswordAuthenticationToken(testUser, null)

        val request = ChangePasswordRequest(oldPassword = "old", newPassword = "new")
        val response = controller.changePassword(request)

        assertThat(response.statusCode).isEqualTo(HttpStatus.OK)
        verify { userDetailsManager.changePassword("old", "new") }
    }

}
