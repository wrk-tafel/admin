package at.wrk.tafel.admin.backend.security

import at.wrk.tafel.admin.backend.common.auth.UserController
import at.wrk.tafel.admin.backend.common.auth.components.PasswordChangeException
import at.wrk.tafel.admin.backend.common.auth.components.TafelLoginFilter
import at.wrk.tafel.admin.backend.common.auth.components.TafelUserDetailsManager
import at.wrk.tafel.admin.backend.common.auth.model.ChangePasswordRequest
import at.wrk.tafel.admin.backend.common.auth.model.TafelJwtAuthentication
import io.mockk.every
import io.mockk.impl.annotations.InjectMockKs
import io.mockk.impl.annotations.RelaxedMockK
import io.mockk.junit5.MockKExtension
import io.mockk.verify
import jakarta.servlet.http.HttpServletRequest
import jakarta.servlet.http.HttpServletResponse
import org.assertj.core.api.Assertions.assertThat
import org.junit.jupiter.api.Test
import org.junit.jupiter.api.extension.ExtendWith
import org.springframework.http.HttpStatus
import org.springframework.security.core.authority.SimpleGrantedAuthority
import org.springframework.security.core.context.SecurityContextHolder
import org.springframework.security.core.context.SecurityContextImpl

@ExtendWith(MockKExtension::class)
class UserControllerTest {

    @RelaxedMockK
    private lateinit var userDetailsManager: TafelUserDetailsManager

    @RelaxedMockK
    private lateinit var request: HttpServletRequest

    @RelaxedMockK
    private lateinit var response: HttpServletResponse

    @InjectMockKs
    private lateinit var controller: UserController

    @Test
    fun `get userinfo`() {
        val authentication = TafelJwtAuthentication(
            tokenValue = "TOKEN",
            username = testUser.username,
            authorities = testUserPermissions.map { SimpleGrantedAuthority(it) }
        )
        SecurityContextHolder.setContext(SecurityContextImpl(authentication))

        val response = controller.getUserInfo()

        assertThat(response.body?.username).isEqualTo(testUser.username)
        assertThat(response.body?.permissions).isEqualTo(testUserPermissions)

        SecurityContextHolder.clearContext()
    }

    @Test
    fun `change password`() {
        val request = ChangePasswordRequest(passwordCurrent = "old", passwordNew = "new")

        val response = controller.changePassword(request)

        assertThat(response.statusCode).isEqualTo(HttpStatus.OK)
        verify { userDetailsManager.changePassword("old", "new") }
    }

    @Test
    fun `change password failed`() {
        val errMsg = "failed"
        val errDetails = listOf("Length error ...", "Complexity error ...")
        every { userDetailsManager.changePassword(any(), any()) } throws PasswordChangeException(errMsg, errDetails)
        val request = ChangePasswordRequest(passwordCurrent = "old", passwordNew = "new")

        val response = controller.changePassword(request)

        assertThat(response.statusCode).isEqualTo(HttpStatus.UNPROCESSABLE_ENTITY)
        assertThat(response.body?.message).isEqualTo(errMsg)
        assertThat(response.body?.details).hasSameElementsAs(errDetails)

        verify { userDetailsManager.changePassword("old", "new") }
    }

    @Test
    fun `logout`() {
        val authentication = TafelJwtAuthentication(
            tokenValue = "TOKEN",
            username = testUser.username,
            authorities = testUserPermissions.map { SimpleGrantedAuthority(it) }
        )
        SecurityContextHolder.setContext(SecurityContextImpl(authentication))

        val responseEntity = controller.logout(request, response)

        assertThat(responseEntity.statusCode.value()).isEqualTo(HttpStatus.OK.value())

        verify {
            response.addCookie(withArg {
                assertThat(it.name).isEqualTo(TafelLoginFilter.jwtCookieName)
                assertThat(it.value).isNull()
                assertThat(it.maxAge).isZero
                assertThat(it.attributes["SameSite"]).isEqualTo("strict")
            })
        }
    }

    @Test
    fun `get user`() {
        every { userDetailsManager.loadUserById(any()) } returns testUser

        val response = controller.getUser(1)

        assertThat(response.statusCode).isEqualTo(HttpStatus.OK)
        assertThat(response.body).isEqualTo(testUserApiResponse)
    }

    @Test
    fun `get users filtered by personnel number`() {
        every { userDetailsManager.loadUserByPersonnelNumber(testUser.personnelNumber) } returns testUser

        val response = controller.getUsers(personnelNumber = testUser.personnelNumber)

        assertThat(response.items).isEqualTo(listOf(testUserApiResponse))
    }

    @Test
    fun `get users filtered by other parameters`() {
        val firstname = "test-firstname"
        val lastname = "test-lastname"
        every { userDetailsManager.loadUsers(firstname, lastname) } returns listOf(testUser)

        val response = controller.getUsers(firstname = firstname, lastname = lastname)

        assertThat(response.items).isEqualTo(listOf(testUserApiResponse))
    }

}
