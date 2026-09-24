package at.wrk.tafel.admin.backend.common.auth

import at.wrk.tafel.admin.backend.TafelBaseIntegrationTest
import at.wrk.tafel.admin.backend.common.auth.model.TafelJwtAuthentication
import at.wrk.tafel.admin.backend.common.auth.model.UserPermissionItem
import at.wrk.tafel.admin.backend.common.auth.model.UserPermissions
import at.wrk.tafel.admin.backend.common.auth.model.UserRequest
import at.wrk.tafel.admin.backend.common.test.TestdataGenerator.createUser
import at.wrk.tafel.admin.backend.database.model.auth.UserEntity
import at.wrk.tafel.admin.backend.database.model.auth.UserRepository
import org.assertj.core.api.Assertions.assertThat
import org.junit.jupiter.api.AfterEach
import org.junit.jupiter.api.BeforeEach
import org.junit.jupiter.api.Test
import org.springframework.beans.factory.annotation.Autowired
import org.springframework.mock.web.MockHttpServletRequest
import org.springframework.mock.web.MockHttpServletResponse
import org.springframework.security.core.authority.SimpleGrantedAuthority
import org.springframework.security.core.context.SecurityContextHolder
import org.springframework.transaction.support.TransactionTemplate

/**
 * The email address of a user goes through the `users.email` column and the real
 * `TafelUserDetailsManager` - a unit test with a mocked repository cannot see a missing column.
 */
class UserEmailIT : TafelBaseIntegrationTest() {

    @Autowired
    private lateinit var userController: UserController

    @Autowired
    private lateinit var userRepository: UserRepository

    @Autowired
    private lateinit var transactionTemplate: TransactionTemplate

    private lateinit var user: UserEntity

    @BeforeEach
    fun beforeEach() {
        user = transactionTemplate.execute { userRepository.saveAndFlush(createUser()) }!!
        SecurityContextHolder.getContext().authentication = TafelJwtAuthentication(
            tokenValue = "token",
            username = user.username,
            authenticated = true,
            authorities = listOf(SimpleGrantedAuthority(UserPermissions.USER_MANAGEMENT.key)),
            userId = user.id,
        )
    }

    @AfterEach
    fun afterEach() {
        SecurityContextHolder.clearContext()
        transactionTemplate.execute { userRepository.deleteById(user.id!!) }
    }

    @Test
    fun `an email saved through the controller is stored trimmed and returned`() {
        val response = update(email = " someone@example.org ")

        assertThat(response.body?.email).isEqualTo("someone@example.org")
        assertThat(userRepository.findById(user.id!!).get().email).isEqualTo("someone@example.org")
        assertThat(userController.getUser(user.id!!).body?.email).isEqualTo("someone@example.org")
    }

    @Test
    fun `a blank email removes a stored one`() {
        update(email = "someone@example.org")

        val response = update(email = "  ")

        assertThat(response.body?.email).isNull()
        assertThat(userRepository.findById(user.id!!).get().email).isNull()
    }

    private fun update(email: String?) = userController.updateUser(
        userId = user.id!!,
        user = UserRequest(
            id = user.id,
            username = user.username,
            personnelNumber = user.employee.personnelNumber,
            firstname = user.employee.firstname,
            lastname = user.employee.lastname,
            email = email,
            enabled = user.enabled,
            passwordChangeRequired = user.passwordChangeRequired,
            permissions = listOf(UserPermissionItem(key = UserPermissions.CHECKIN.key, title = "", category = "")),
        ),
        request = MockHttpServletRequest(),
        response = MockHttpServletResponse(),
    )
}
