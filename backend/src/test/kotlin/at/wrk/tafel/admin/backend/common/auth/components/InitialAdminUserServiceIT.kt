package at.wrk.tafel.admin.backend.common.auth.components

import at.wrk.tafel.admin.backend.common.auth.model.UserPermissions
import at.wrk.tafel.admin.backend.database.model.auth.UserRepository
import org.assertj.core.api.Assertions.assertThat
import org.junit.jupiter.api.Test
import org.springframework.beans.factory.annotation.Autowired
import org.springframework.boot.jdbc.test.autoconfigure.AutoConfigureTestDatabase
import org.springframework.boot.test.context.SpringBootTest
import org.springframework.security.crypto.password.PasswordEncoder
import org.springframework.test.context.DynamicPropertyRegistry
import org.springframework.test.context.DynamicPropertySource
import org.testcontainers.postgresql.PostgreSQLContainer

/**
 * Boots the application the way a brand-new installation does: migrations against a database that
 * has never held anything, and nothing but [InitialAdminUserService] to make it loggable into.
 * Whether the account it builds actually persists - sequences, the employee it needs, the encoded
 * password - can only be answered against a real database, and only in the empty state a running
 * installation is never in again.
 *
 * Runs on its own container and its own context on purpose: the shared
 * [at.wrk.tafel.admin.backend.TafelBaseIntegrationTest] container accumulates committed users from
 * other tests, which is precisely the state that (correctly) turns this bootstrap into a no-op.
 */
@SpringBootTest(
    properties = [
        "tafeladmin.setup.initialAdmin.enabled=true",
        // Configured rather than generated so the test can check the account can actually be logged
        // into; the generated path is covered by InitialAdminUserServiceTest.
        "tafeladmin.setup.initialAdmin.password=Startpasswort1",
    ],
)
@AutoConfigureTestDatabase(replace = AutoConfigureTestDatabase.Replace.NONE)
class InitialAdminUserServiceIT {

    companion object {
        private val postgreSQLContainer: PostgreSQLContainer = PostgreSQLContainer("postgres:18.4-bookworm")
            .withDatabaseName("tafeladmin-initialadmin")
            .withUsername("admin")
            .withPassword("admin")
            .apply { start() }

        @DynamicPropertySource
        @JvmStatic
        fun dynamicDataSourceProperties(registry: DynamicPropertyRegistry) {
            registry.add("spring.datasource.url", postgreSQLContainer::getJdbcUrl)
            registry.add("spring.datasource.username", postgreSQLContainer::getUsername)
            registry.add("spring.datasource.password", postgreSQLContainer::getPassword)
        }
    }

    @Autowired
    private lateinit var initialAdminUserService: InitialAdminUserService

    @Autowired
    private lateinit var userRepository: UserRepository

    @Autowired
    private lateinit var passwordEncoder: PasswordEncoder

    @Test
    fun `starting up against an empty database creates a working administrator`() {
        val createdUser = userRepository.findByUsername("admin")!!

        assertThat(createdUser.enabled).isTrue
        assertThat(createdUser.passwordChangeRequired).isTrue
        assertThat(passwordEncoder.matches("Startpasswort1", createdUser.password)).isTrue
        assertThat(createdUser.authorities.map { it.name })
            .containsExactly(UserPermissions.ADMINISTRATOR.key)
        assertThat(createdUser.employee.personnelNumber).isEqualTo("00001")
        assertThat(createdUser.employee.firstname).isEqualTo("Tafel")
        assertThat(createdUser.employee.lastname).isEqualTo("Administrator")
    }

    /**
     * Every later start runs the same code against a database that now has users - it has to stay a
     * no-op, or an installation would grow a fresh administrator with a known password on every
     * restart.
     */
    @Test
    fun `running again over an installation that already has users changes nothing`() {
        val usersBefore = userRepository.findAll().map { it.id }
        assertThat(usersBefore).isNotEmpty

        initialAdminUserService.createInitialAdminUserIfMissing()

        assertThat(userRepository.findAll().map { it.id }).isEqualTo(usersBefore)
    }
}
