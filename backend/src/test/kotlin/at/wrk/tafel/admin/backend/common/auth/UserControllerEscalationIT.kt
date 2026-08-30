package at.wrk.tafel.admin.backend.common.auth

import at.wrk.tafel.admin.backend.TafelBaseIntegrationTest
import at.wrk.tafel.admin.backend.common.auth.components.TafelLoginFilter
import at.wrk.tafel.admin.backend.common.auth.model.TafelJwtAuthentication
import at.wrk.tafel.admin.backend.common.auth.model.UserPermissionItem
import at.wrk.tafel.admin.backend.common.auth.model.UserPermissions
import at.wrk.tafel.admin.backend.common.auth.model.UserRequest
import at.wrk.tafel.admin.backend.common.test.TestdataGenerator.createUser
import at.wrk.tafel.admin.backend.database.model.auth.UserAuthorityEntity
import at.wrk.tafel.admin.backend.database.model.auth.UserEntity
import at.wrk.tafel.admin.backend.database.model.auth.UserRepository
import at.wrk.tafel.admin.backend.modules.base.exception.TafelApiException
import org.assertj.core.api.Assertions.assertThat
import org.junit.jupiter.api.AfterEach
import org.junit.jupiter.api.BeforeEach
import org.junit.jupiter.api.Test
import org.junit.jupiter.api.assertThrows
import org.springframework.beans.factory.annotation.Autowired
import org.springframework.http.HttpStatus
import org.springframework.mock.web.MockHttpServletRequest
import org.springframework.mock.web.MockHttpServletResponse
import org.springframework.security.core.authority.SimpleGrantedAuthority
import org.springframework.security.core.context.SecurityContextHolder
import org.springframework.security.crypto.password.PasswordEncoder
import org.springframework.transaction.support.TransactionTemplate

/**
 * Exercises the escalation path from issue #3566 against a real database and the real
 * `TafelUserDetailsManager`/`PasswordEncoder` wiring - a unit test with mocked collaborators
 * (`UserControllerTest`) already pins down [UserController]'s own decision, but only a real
 * password hash on the administrator row proves nothing actually changed underneath it.
 */
class UserControllerEscalationIT : TafelBaseIntegrationTest() {

    @Autowired
    private lateinit var userController: UserController

    @Autowired
    private lateinit var userRepository: UserRepository

    @Autowired
    private lateinit var transactionTemplate: TransactionTemplate

    @Autowired
    private lateinit var passwordEncoder: PasswordEncoder

    private lateinit var administrator: UserEntity
    private lateinit var userManager: UserEntity

    @BeforeEach
    fun beforeEach() {
        administrator = createUserWithAuthority(UserPermissions.ADMINISTRATOR)
        userManager = createUserWithAuthority(UserPermissions.USER_MANAGEMENT)
    }

    @AfterEach
    fun afterEach() {
        SecurityContextHolder.clearContext()
        transactionTemplate.execute {
            userRepository.deleteById(administrator.id!!)
            userRepository.deleteById(userManager.id!!)
        }
    }

    @Test
    fun `a USER_MANAGEMENT-only caller cannot reset an administrator's password`() {
        authenticateAs(userManager, UserPermissions.USER_MANAGEMENT)

        val request = updateRequestFor(administrator)
            .copy(password = "aNewSecretPassword1", passwordRepeat = "aNewSecretPassword1")

        val exception = assertThrows<TafelApiException> {
            userController.updateUser(
                userId = administrator.id!!,
                user = request,
                request = MockHttpServletRequest(),
                response = MockHttpServletResponse(),
            )
        }
        assertThat(exception.statusCode).isEqualTo(HttpStatus.FORBIDDEN)

        val persisted = userRepository.findById(administrator.id!!).get()
        assertThat(persisted.password).isEqualTo(administrator.password)
    }

    @Test
    fun `a USER_MANAGEMENT-only caller cannot rename an administrator's account`() {
        authenticateAs(userManager, UserPermissions.USER_MANAGEMENT)

        val request = updateRequestFor(administrator).copy(username = "hijacked-${administrator.username}")

        val exception = assertThrows<TafelApiException> {
            userController.updateUser(
                userId = administrator.id!!,
                user = request,
                request = MockHttpServletRequest(),
                response = MockHttpServletResponse(),
            )
        }
        assertThat(exception.statusCode).isEqualTo(HttpStatus.FORBIDDEN)

        val persisted = userRepository.findById(administrator.id!!).get()
        assertThat(persisted.username).isEqualTo(administrator.username)
    }

    @Test
    fun `an administrator caller can reset another administrator's password`() {
        // A real login expands the ADMINISTRATOR authority into every permission (see
        // TafelJwtAuthProvider.effectivePermissions) - USER_MANAGEMENT is what the endpoint's
        // @PreAuthorize actually checks, so it has to be present here too.
        authenticateAs(administrator, UserPermissions.ADMINISTRATOR, UserPermissions.USER_MANAGEMENT)

        val request = updateRequestFor(administrator)
            .copy(password = "aNewSecretPassword1", passwordRepeat = "aNewSecretPassword1")

        userController.updateUser(
            userId = administrator.id!!,
            user = request,
            request = MockHttpServletRequest(),
            response = MockHttpServletResponse(),
        )

        val persisted = userRepository.findById(administrator.id!!).get()
        assertThat(passwordEncoder.matches("aNewSecretPassword1", persisted.password)).isTrue()
    }

    /**
     * The self-service path this endpoint also serves (issue #3572): resetting one's own password
     * invalidates every JWT issued for the account, including the one this very request came in on
     * (`TafelUserDetailsManager.mapToUserEntity`), so a replacement cookie has to be minted here too,
     * the same way `UserController.changePassword` already does for `POST /api/users/change-password`.
     */
    @Test
    fun `an administrator resetting their own password through this endpoint gets a replacement cookie`() {
        authenticateAs(administrator, UserPermissions.ADMINISTRATOR, UserPermissions.USER_MANAGEMENT)

        val request = updateRequestFor(administrator)
            .copy(password = "aNewSecretPassword1", passwordRepeat = "aNewSecretPassword1")
        val response = MockHttpServletResponse()

        userController.updateUser(
            userId = administrator.id!!,
            user = request,
            request = MockHttpServletRequest(),
            response = response,
        )

        val cookie = response.getCookie(TafelLoginFilter.jwtCookieName)
        assertThat(cookie).isNotNull
        assertThat(cookie!!.value).isNotBlank()
    }

    private fun createUserWithAuthority(permission: UserPermissions): UserEntity = transactionTemplate.execute {
        val user = userRepository.saveAndFlush(createUser())
        // orphanRemoval on UserEntity.authorities requires mutating the managed collection in
        // place - assigning a brand-new list makes Hibernate see the old PersistentCollection as
        // dereferenced and throw, rather than orphaning it (same reasoning as syncAuthorities).
        user.authorities.add(UserAuthorityEntity(user = user, name = permission.key))
        userRepository.saveAndFlush(user)
    }

    private fun authenticateAs(user: UserEntity, vararg permissions: UserPermissions) {
        SecurityContextHolder.getContext().authentication = TafelJwtAuthentication(
            tokenValue = "token",
            username = user.username,
            authenticated = true,
            authorities = permissions.map { SimpleGrantedAuthority(it.key) },
            userId = user.id,
        )
    }

    private fun updateRequestFor(user: UserEntity) = UserRequest(
        id = user.id,
        username = user.username,
        personnelNumber = user.employee.personnelNumber,
        firstname = user.employee.firstname,
        lastname = user.employee.lastname,
        enabled = user.enabled,
        passwordChangeRequired = user.passwordChangeRequired,
        permissions = user.authorities.map { UserPermissionItem(key = it.name, title = it.name, category = "") },
    )
}
