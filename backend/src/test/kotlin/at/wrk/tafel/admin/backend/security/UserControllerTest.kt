package at.wrk.tafel.admin.backend.security

import at.wrk.tafel.admin.backend.common.auth.UserController
import at.wrk.tafel.admin.backend.common.auth.components.PasswordChangeException
import at.wrk.tafel.admin.backend.common.auth.components.TafelLoginFilter
import at.wrk.tafel.admin.backend.common.auth.components.TafelPasswordGenerator
import at.wrk.tafel.admin.backend.common.auth.components.TafelUserDetailsManager
import at.wrk.tafel.admin.backend.common.auth.components.UserSearchResult
import at.wrk.tafel.admin.backend.common.auth.model.ChangePasswordRequest
import at.wrk.tafel.admin.backend.common.auth.model.GeneratedPasswordResponse
import at.wrk.tafel.admin.backend.common.auth.model.TafelJwtAuthentication
import at.wrk.tafel.admin.backend.common.auth.model.TafelUser
import at.wrk.tafel.admin.backend.common.auth.model.User
import at.wrk.tafel.admin.backend.common.auth.model.UserPermission
import at.wrk.tafel.admin.backend.common.auth.model.UserPermissions
import at.wrk.tafel.admin.backend.common.testdata.testUser
import at.wrk.tafel.admin.backend.common.testdata.testUserApiResponse
import at.wrk.tafel.admin.backend.common.testdata.testUserPermissions
import at.wrk.tafel.admin.backend.modules.base.exception.TafelValidationException
import io.mockk.every
import io.mockk.impl.annotations.InjectMockKs
import io.mockk.impl.annotations.RelaxedMockK
import io.mockk.junit5.MockKExtension
import io.mockk.slot
import io.mockk.verify
import jakarta.servlet.http.HttpServletRequest
import jakarta.servlet.http.HttpServletResponse
import org.assertj.core.api.Assertions.assertThat
import org.junit.jupiter.api.Test
import org.junit.jupiter.api.assertThrows
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
    private lateinit var tafelPasswordGenerator: TafelPasswordGenerator

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
            authorities = testUserPermissions.map { SimpleGrantedAuthority(it.key) }
        )
        SecurityContextHolder.setContext(SecurityContextImpl(authentication))

        val response = controller.getUserInfo()

        assertThat(response.body?.username).isEqualTo(testUser.username)
        assertThat(response.body?.permissions).isEqualTo(testUserPermissions.map { it.key })

        SecurityContextHolder.clearContext()
    }

    @Test
    fun `generate password`() {
        val generatedPassword = "pwd-generated"
        every { tafelPasswordGenerator.generatePassword() } returns generatedPassword

        val response = controller.generatePassword()

        assertThat(response.statusCode).isEqualTo(HttpStatus.OK)
        assertThat(response.body).isEqualTo(GeneratedPasswordResponse(password = generatedPassword))
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

        assertThat(response.statusCode).isEqualTo(HttpStatus.BAD_REQUEST)
        assertThat(response.body?.message).isEqualTo(errMsg)
        assertThat(response.body?.details).hasSameElementsAs(errDetails)

        verify { userDetailsManager.changePassword("old", "new") }
    }

    @Test
    fun `logout`() {
        val authentication = TafelJwtAuthentication(
            tokenValue = "TOKEN",
            username = testUser.username,
            authorities = testUserPermissions.map { SimpleGrantedAuthority(it.key) }
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
    fun `get user not found`() {
        every { userDetailsManager.loadUserById(any()) } returns null

        val exception = assertThrows<TafelValidationException> { controller.getUser(1) }
        assertThat(exception.status).isEqualTo(HttpStatus.NOT_FOUND)
        assertThat(exception.message).isEqualTo("Benutzer (ID: 1) nicht gefunden!")
    }

    @Test
    fun `get user found and mapped properly`() {
        every { userDetailsManager.loadUserById(any()) } returns testUser

        val response = controller.getUser(1)

        assertThat(response.statusCode).isEqualTo(HttpStatus.OK)
        assertThat(response.body).isEqualTo(testUserApiResponse)
    }

    @Test
    fun `get users found when filtered by personnel number`() {
        every { userDetailsManager.loadUserByPersonnelNumber(testUser.personnelNumber) } returns testUser

        val response = controller.getUserByPersonnelNumber(" ${testUser.personnelNumber} ")

        assertThat(response.statusCode).isEqualTo(HttpStatus.OK)
        assertThat(response.body).isEqualTo(testUserApiResponse)

        verify(exactly = 1) { userDetailsManager.loadUserByPersonnelNumber(testUser.personnelNumber) }
    }

    @Test
    fun `get users not found when filtered by personnel number`() {
        every { userDetailsManager.loadUserByPersonnelNumber(testUser.personnelNumber) } returns null

        val exception =
            assertThrows<TafelValidationException> { controller.getUserByPersonnelNumber(testUser.personnelNumber) }
        assertThat(exception.status).isEqualTo(HttpStatus.NOT_FOUND)
        assertThat(exception.message).isEqualTo("Benutzer (Personalnummer: test-personnelnumber) nicht gefunden!")
    }

    @Test
    fun `get users filtered by other parameters`() {
        val firstname = " test-firstname "
        val lastname = " test-lastname "
        val username = " test-username "
        val enabled = true
        val page = 5
        val userSearchResult = UserSearchResult(
            items = listOf(testUser),
            totalCount = 20,
            currentPage = page,
            totalPages = 10,
            pageSize = 2
        )

        every {
            userDetailsManager.loadUsers(
                username = username.trim(),
                firstname = firstname.trim(),
                lastname = lastname.trim(),
                enabled = enabled,
                page = page
            )
        } returns userSearchResult

        val response =
            controller.getUsers(
                firstname = firstname,
                lastname = lastname,
                username = username,
                enabled = enabled,
                page = page
            )

        assertThat(response.items).isEqualTo(listOf(testUserApiResponse))
        assertThat(response.totalCount).isEqualTo(userSearchResult.totalCount)
        assertThat(response.currentPage).isEqualTo(userSearchResult.currentPage)
        assertThat(response.totalPages).isEqualTo(userSearchResult.totalPages)
        assertThat(response.pageSize).isEqualTo(userSearchResult.pageSize)

        verify(exactly = 1) {
            userDetailsManager.loadUsers(
                username = username.trim(),
                firstname = firstname.trim(),
                lastname = lastname.trim(),
                enabled = enabled,
                page = page
            )
        }
    }

    @Test
    fun `create user`() {
        every { userDetailsManager.loadUserByUsername(any()) } returns testUser

        val response = controller.createUser(user = testUserApiResponse)

        assertThat(response.statusCode).isEqualTo(HttpStatus.OK)
        assertThat(response.body).isEqualTo(testUserApiResponse)

        verify(exactly = 1) { userDetailsManager.createUser(testUser) }
    }

    @Test
    fun `update user not found`() {
        every { userDetailsManager.loadUserById(any()) } returns null

        val exception =
            assertThrows<TafelValidationException> { controller.updateUser(userId = 123, user = testUserApiResponse) }

        assertThat(exception.status).isEqualTo(HttpStatus.NOT_FOUND)
        assertThat(exception.message).isEqualTo("Benutzer (ID: 123) nicht vorhanden!")
    }

    @Test
    fun `update user found`() {
        every { userDetailsManager.loadUserById(any()) } returns testUser

        val newPermission = UserPermission(
            key = UserPermissions.CHECKIN.key,
            title = UserPermissions.CHECKIN.title
        )
        val updatedUser = User(
            id = 123,
            username = "updated-username",
            personnelNumber = "updated-personnelnumber",
            firstname = "updated-firstname",
            lastname = "updated-lastname",
            permissions = listOf(newPermission),
            passwordChangeRequired = true,
            enabled = false
        )

        val updatedUserResponse = controller.updateUser(userId = testUser.id, user = updatedUser)

        assertThat(updatedUserResponse.statusCode).isEqualTo(HttpStatus.OK)
        assertThat(updatedUserResponse.body).isEqualTo(testUserApiResponse)

        val updatedUserDetailsSlot = slot<TafelUser>()
        verify(exactly = 1) { userDetailsManager.updateUser(capture(updatedUserDetailsSlot)) }

        val userDetails = updatedUserDetailsSlot.captured
        assertThat(userDetails.id).isEqualTo(updatedUser.id)
        assertThat(userDetails.username).isEqualTo(updatedUser.username)
        assertThat(userDetails.personnelNumber).isEqualTo(updatedUser.personnelNumber)
        assertThat(userDetails.firstname).isEqualTo(updatedUser.firstname)
        assertThat(userDetails.lastname).isEqualTo(updatedUser.lastname)
        assertThat(userDetails.authorities).isEqualTo(listOf(SimpleGrantedAuthority(UserPermissions.CHECKIN.key)))
        assertThat(userDetails.password).isEqualTo(updatedUser.password)
        assertThat(userDetails.passwordChangeRequired).isEqualTo(updatedUser.passwordChangeRequired)
        assertThat(userDetails.enabled).isEqualTo(updatedUser.enabled)
    }

    @Test
    fun `update user including password change`() {
        every { userDetailsManager.loadUserById(any()) } returns testUser

        val newPassword = "123"
        val updatedUserResponse = controller.updateUser(
            userId = 123,
            user = testUserApiResponse.copy(password = newPassword, passwordRepeat = newPassword)
        )

        assertThat(updatedUserResponse.statusCode).isEqualTo(HttpStatus.OK)
        assertThat(updatedUserResponse.body).isEqualTo(testUserApiResponse)
        verify(exactly = 1) { userDetailsManager.updateUser(testUser.copy(password = newPassword)) }
    }

    @Test
    fun `update user with passwords not matching`() {
        every { userDetailsManager.loadUserById(any()) } returns testUser

        val exception = assertThrows<TafelValidationException> {
            controller.updateUser(
                userId = 123,
                user = testUserApiResponse.copy(password = "123", passwordRepeat = "456")
            )
        }

        assertThat(exception.status).isEqualTo(HttpStatus.BAD_REQUEST)
        assertThat(exception.message).isEqualTo("Passwörter stimmen nicht überein!")
    }

    @Test
    fun `delete user not found`() {
        every { userDetailsManager.loadUserById(any()) } returns null

        val exception =
            assertThrows<TafelValidationException> { controller.deleteUser(userId = 123) }

        assertThat(exception.status).isEqualTo(HttpStatus.NOT_FOUND)
        assertThat(exception.message).isEqualTo("Benutzer (ID: 123) nicht vorhanden!")
    }

    @Test
    fun `delete user found`() {
        every { userDetailsManager.loadUserById(any()) } returns testUser

        controller.deleteUser(userId = 123)

        verify(exactly = 1) { userDetailsManager.deleteUser(testUser.username) }
    }

    @Test
    fun `get permissions`() {
        every { userDetailsManager.loadUserById(any()) } returns testUser

        val response = controller.getPermissions()

        assertThat(response.statusCode).isEqualTo(HttpStatus.OK)

        val permissions = response.body?.permissions
        assertThat(permissions).hasSize(UserPermissions.values().size)
        assertThat(permissions?.first()).isEqualTo(
            UserPermission(
                key = UserPermissions.values().first().key,
                title = UserPermissions.values().first().title
            )
        )
    }

}
