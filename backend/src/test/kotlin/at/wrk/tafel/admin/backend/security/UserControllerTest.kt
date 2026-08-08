package at.wrk.tafel.admin.backend.security

import at.wrk.tafel.admin.backend.common.api.PagedResponse
import at.wrk.tafel.admin.backend.common.api.PaginationDefaults
import at.wrk.tafel.admin.backend.common.auth.UserController
import at.wrk.tafel.admin.backend.common.auth.components.*
import at.wrk.tafel.admin.backend.common.auth.model.*
import at.wrk.tafel.admin.backend.config.properties.TafelAdminProperties
import at.wrk.tafel.admin.backend.config.properties.TafelAdminServerProperties
import at.wrk.tafel.admin.backend.modules.base.exception.BusinessRuleException
import at.wrk.tafel.admin.backend.modules.base.exception.ConflictException
import at.wrk.tafel.admin.backend.modules.base.exception.NotFoundException
import io.mockk.every
import io.mockk.impl.annotations.InjectMockKs
import io.mockk.impl.annotations.RelaxedMockK
import io.mockk.junit5.MockKExtension
import io.mockk.slot
import io.mockk.verify
import jakarta.servlet.http.HttpServletRequest
import jakarta.servlet.http.HttpServletResponse
import org.assertj.core.api.Assertions.assertThat
import org.junit.jupiter.api.AfterEach
import org.junit.jupiter.api.Test
import org.junit.jupiter.api.assertThrows
import org.junit.jupiter.api.extension.ExtendWith
import org.springframework.data.domain.PageImpl
import org.springframework.data.domain.PageRequest
import org.springframework.http.HttpStatus
import org.springframework.security.core.authority.SimpleGrantedAuthority
import org.springframework.security.core.context.SecurityContextHolder
import org.springframework.security.core.context.SecurityContextImpl
import org.springframework.security.core.userdetails.UsernameNotFoundException
import java.time.LocalDate

@ExtendWith(MockKExtension::class)
class UserControllerTest {

    @RelaxedMockK
    private lateinit var userDetailsManager: TafelUserDetailsManager

    @RelaxedMockK
    private lateinit var tafelPasswordGenerator: TafelPasswordGenerator

    @RelaxedMockK
    private lateinit var tafelAdminProperties: TafelAdminProperties

    @RelaxedMockK
    private lateinit var loginAttemptService: LoginAttemptService

    @RelaxedMockK
    private lateinit var request: HttpServletRequest

    @RelaxedMockK
    private lateinit var response: HttpServletResponse

    @InjectMockKs
    private lateinit var controller: UserController

    @AfterEach
    fun afterEach() {
        SecurityContextHolder.clearContext()
    }

    @Test
    fun `get userinfo`() {
        val authentication = TafelJwtAuthentication(
            tokenValue = "TOKEN",
            username = testUser.username,
            authorities = testUserPermissions.map { SimpleGrantedAuthority(it.key) },
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
        val relativeBaseUrl = "/test-base/"
        every { tafelAdminProperties.server } returns TafelAdminServerProperties().apply { this.relativeBaseUrl = relativeBaseUrl }

        val authentication = TafelJwtAuthentication(
            tokenValue = "TOKEN",
            username = testUser.username,
            authorities = testUserPermissions.map { SimpleGrantedAuthority(it.key) },
        )
        SecurityContextHolder.setContext(SecurityContextImpl(authentication))

        val responseEntity = controller.logout(request, response)

        assertThat(responseEntity.statusCode.value()).isEqualTo(HttpStatus.OK.value())

        verify {
            response.addCookie(
                withArg {
                    assertThat(it.name).isEqualTo(TafelLoginFilter.jwtCookieName)
                    assertThat(it.value).isNull()
                    assertThat(it.maxAge).isZero
                    assertThat(it.path).isEqualTo(relativeBaseUrl)
                    assertThat(it.attributes["SameSite"]).isEqualTo("strict")
                },
            )
        }
    }

    @Test
    fun `get user not found`() {
        every { userDetailsManager.loadUserById(any()) } returns null

        val exception = assertThrows<NotFoundException> { controller.getUser(1) }
        assertThat(exception.statusCode).isEqualTo(HttpStatus.NOT_FOUND)
        assertThat(exception.body.detail).isEqualTo("Benutzer (ID: 1) nicht gefunden!")
    }

    @Test
    fun `get user found and mapped properly`() {
        every { userDetailsManager.loadUserById(any()) } returns testUser

        val response = controller.getUser(1)

        assertThat(response.statusCode).isEqualTo(HttpStatus.OK)
        assertThat(response.body).isEqualTo(testUserResponse)
    }

    @Test
    fun `get users found when filtered by personnel number`() {
        every { userDetailsManager.loadUserByPersonnelNumber(testUser.personnelNumber) } returns testUser

        val response = controller.getUserByPersonnelNumber(" ${testUser.personnelNumber} ")

        assertThat(response.statusCode).isEqualTo(HttpStatus.OK)
        assertThat(response.body).isEqualTo(testUserResponse)

        verify(exactly = 1) { userDetailsManager.loadUserByPersonnelNumber(testUser.personnelNumber) }
    }

    @Test
    fun `get users not found when filtered by personnel number`() {
        every { userDetailsManager.loadUserByPersonnelNumber(testUser.personnelNumber) } returns null

        val exception =
            assertThrows<NotFoundException> { controller.getUserByPersonnelNumber(testUser.personnelNumber) }
        assertThat(exception.statusCode).isEqualTo(HttpStatus.NOT_FOUND)
        assertThat(exception.body.detail).isEqualTo("Benutzer (Personalnummer: test-personnelnumber) nicht gefunden!")
    }

    @Test
    fun `get users filtered by other parameters`() {
        val searchInput = " test-searchinput "
        val enabled = true
        val page = 5
        val userSearchResult = UserSearchResult(
            items = listOf(testUser),
            totalCount = 20,
            currentPage = page,
            totalPages = 10,
            pageSize = 2,
        )

        every {
            userDetailsManager.loadUsers(
                searchInput = searchInput,
                enabled = enabled,
                page = page,
            )
        } returns userSearchResult

        val response =
            controller.getUsers(
                searchInput = searchInput,
                enabled = enabled,
                page = page,
            )

        assertThat(response.items).isEqualTo(listOf(testUserResponse))
        assertThat(response.totalCount).isEqualTo(userSearchResult.totalCount)
        assertThat(response.currentPage).isEqualTo(userSearchResult.currentPage)
        assertThat(response.totalPages).isEqualTo(userSearchResult.totalPages)
        assertThat(response.pageSize).isEqualTo(userSearchResult.pageSize)

        verify(exactly = 1) {
            userDetailsManager.loadUsers(
                searchInput = searchInput,
                enabled = enabled,
                page = page,
            )
        }
    }

    @Test
    fun `create user`() {
        every { userDetailsManager.loadUserByUsername(any()) } throws UsernameNotFoundException("dummy") andThen testUser
        every { userDetailsManager.loadUserByPersonnelNumber(any()) } returns null

        val response = controller.createUser(user = testUserRequest)

        assertThat(response.statusCode).isEqualTo(HttpStatus.CREATED)
        assertThat(response.body).isEqualTo(testUserResponse)

        verify(exactly = 1) { userDetailsManager.createUser(testUser) }
    }

    @Test
    fun `create user exists by username`() {
        every { userDetailsManager.loadUserByUsername(any()) } returns testUser

        val exception = assertThrows<ConflictException> { controller.createUser(user = testUserRequest) }
        assertThat(exception.body.detail).isEqualTo("Benutzer (Benutzername: test-username) existiert bereits!")
    }

    @Test
    fun `create user exists by personnelNumber`() {
        every { userDetailsManager.loadUserByUsername(any()) } throws UsernameNotFoundException("dummy")
        every { userDetailsManager.loadUserByPersonnelNumber(any()) } returns testUser

        val exception = assertThrows<ConflictException> { controller.createUser(user = testUserRequest) }
        assertThat(exception.body.detail).isEqualTo("Benutzer (Personalnummer: test-personnelnumber) existiert bereits!")
    }

    @Test
    fun `update user not found`() {
        every { userDetailsManager.loadUserById(any()) } returns null

        val exception =
            assertThrows<NotFoundException> { controller.updateUser(userId = 123, user = testUserRequest) }

        assertThat(exception.statusCode).isEqualTo(HttpStatus.NOT_FOUND)
        assertThat(exception.body.detail).isEqualTo("Benutzer (ID: 123) nicht vorhanden!")
    }

    @Test
    fun `update user found`() {
        every { userDetailsManager.loadUserById(any()) } returns testUser

        val newPermission = UserPermissionItem(
            key = UserPermissions.CHECKIN.key,
            title = UserPermissions.CHECKIN.title,
            category = UserPermissions.CHECKIN.category.title,
        )
        val updatedUser = UserRequest(
            id = 123,
            username = "updated-username",
            personnelNumber = "updated-personnelnumber",
            firstname = "updated-firstname",
            lastname = "updated-lastname",
            permissions = listOf(newPermission),
            passwordChangeRequired = true,
            enabled = false,
        )

        val updatedUserResponse = controller.updateUser(userId = testUser.id!!, user = updatedUser)

        assertThat(updatedUserResponse.statusCode).isEqualTo(HttpStatus.OK)
        assertThat(updatedUserResponse.body).isEqualTo(testUserResponse)

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
            user = testUserRequest.copy(password = newPassword, passwordRepeat = newPassword),
        )

        assertThat(updatedUserResponse.statusCode).isEqualTo(HttpStatus.OK)
        assertThat(updatedUserResponse.body).isEqualTo(testUserResponse)
        verify(exactly = 1) { userDetailsManager.updateUser(testUser.copy(password = newPassword)) }
    }

    @Test
    fun `update user with passwords not matching`() {
        every { userDetailsManager.loadUserById(any()) } returns testUser

        val exception = assertThrows<BusinessRuleException> {
            controller.updateUser(
                userId = 123,
                user = testUserRequest.copy(password = "123", passwordRepeat = "456"),
            )
        }

        assertThat(exception.statusCode).isEqualTo(HttpStatus.BAD_REQUEST)
        assertThat(exception.body.detail).isEqualTo("Passwörter stimmen nicht überein!")
    }

    @Test
    fun `delete user not found`() {
        every { userDetailsManager.loadUserById(any()) } returns null

        val exception =
            assertThrows<NotFoundException> { controller.deleteUser(userId = 123) }

        assertThat(exception.statusCode).isEqualTo(HttpStatus.NOT_FOUND)
        assertThat(exception.body.detail).isEqualTo("Benutzer (ID: 123) nicht vorhanden!")
    }

    @Test
    fun `delete user found`() {
        every { userDetailsManager.loadUserById(any()) } returns testUser

        val response = controller.deleteUser(userId = 123)

        assertThat(response.statusCode).isEqualTo(HttpStatus.NO_CONTENT)
        verify(exactly = 1) { userDetailsManager.deleteUser(testUser.username) }
    }

    @Test
    fun `get permissions`() {
        every { userDetailsManager.loadUserById(any()) } returns testUser

        val response = controller.getPermissions()

        assertThat(response.statusCode).isEqualTo(HttpStatus.OK)

        val permissions = response.body?.permissions

        val userPermissionEntries = UserPermissions.entries
        assertThat(permissions).hasSize(userPermissionEntries.size)
        assertThat(permissions?.first()).isEqualTo(
            UserPermissionItem(
                key = userPermissionEntries.first().key,
                title = userPermissionEntries.first().title,
                category = userPermissionEntries.first().category.title,
            ),
        )
    }

    @Test
    fun `fetch login attempts as a page`() {
        val older = LoginAttemptItem(
            id = 1,
            username = "user1",
            failureCount = 1,
            lastFailureAt = LocalDate.of(2026, 1, 1).atStartOfDay(),
            lockedUntil = null,
        )
        val newer = LoginAttemptItem(
            id = 2,
            username = "user2",
            failureCount = 3,
            lastFailureAt = LocalDate.of(2026, 1, 2).atStartOfDay(),
            lockedUntil = LocalDate.of(2026, 1, 2).atStartOfDay().plusMinutes(15),
        )
        val pageRequest = PageRequest.of(0, PaginationDefaults.DEFAULT_PAGE_SIZE)
        val pagedResult = PageImpl(listOf(newer, older), pageRequest, 123)
        every { loginAttemptService.findAll(pageRequest) } returns pagedResult

        val response = controller.getLoginAttempts()

        assertThat(response).isEqualTo(
            PagedResponse(
                items = listOf(newer, older),
                totalCount = 123,
                currentPage = 1,
                totalPages = pagedResult.totalPages,
                pageSize = PaginationDefaults.DEFAULT_PAGE_SIZE,
            ),
        )
    }

    @Test
    fun `fetch login attempts with explicit valid pageSize`() {
        val pageRequest = PageRequest.of(0, 25)
        every { loginAttemptService.findAll(pageRequest) } returns PageImpl(emptyList(), pageRequest, 0)

        val response = controller.getLoginAttempts(page = 1, pageSize = 25)

        assertThat(response.pageSize).isEqualTo(25)
    }

    @Test
    fun `fetch login attempts with invalid pageSize falls back to default`() {
        val pageRequest = PageRequest.of(0, PaginationDefaults.DEFAULT_PAGE_SIZE)
        every { loginAttemptService.findAll(pageRequest) } returns PageImpl(emptyList(), pageRequest, 0)

        val response = controller.getLoginAttempts(page = 1, pageSize = 7)

        assertThat(response.pageSize).isEqualTo(PaginationDefaults.DEFAULT_PAGE_SIZE)
    }

    @Test
    fun `delete login attempt`() {
        val response = controller.deleteLoginAttempt(42L)

        assertThat(response.statusCode.value()).isEqualTo(204)
        verify(exactly = 1) { loginAttemptService.deleteById(42L) }
    }
}
