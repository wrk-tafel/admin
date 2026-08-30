package at.wrk.tafel.admin.backend.common.auth.components

import at.wrk.tafel.admin.backend.TEST_POSTGRES_IMAGE
import at.wrk.tafel.admin.backend.common.auth.model.UserPermissions
import at.wrk.tafel.admin.backend.config.properties.TafelAdminProperties
import at.wrk.tafel.admin.backend.database.model.auth.UserRepository
import at.wrk.tafel.admin.backend.database.model.base.EmployeeEntity
import at.wrk.tafel.admin.backend.database.model.base.EmployeeRepository
import org.assertj.core.api.Assertions.assertThat
import org.junit.jupiter.api.Test
import org.springframework.beans.factory.annotation.Autowired
import org.springframework.boot.DefaultApplicationArguments
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
        private val postgreSQLContainer: PostgreSQLContainer = PostgreSQLContainer(TEST_POSTGRES_IMAGE)
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

/**
 * A brand-new installation is also what ADR-0035's "wipe the users table" recovery path produces -
 * except there `employees` was never wiped, so the configured personnel number can already be
 * sitting in the database when [InitialAdminUserService] runs. `TafelUserDetailsManager.resolveEmployee`
 * loads that row and `userRepository.save` has to cascade onto the very same managed instance, which
 * only works inside one transaction spanning both (issue #3522) - runs on its own container so this
 * class can control the exact database state the boot sees, and calls [InitialAdminUserService.run]
 * itself rather than [InitialAdminUserService.createInitialAdminUserIfMissing] directly: Spring's
 * transactional proxy never intercepts a self-invocation, so a transaction present only on the
 * latter would silently not apply to the real `ApplicationRunner` boot path (see
 * [InitialAdminUserService.run]'s KDoc).
 */
@SpringBootTest(
    properties = [
        // Kept off across context startup - the pre-existing employee has to be in place before
        // InitialAdminUserService acts, and startup is the one moment this test can't control that.
        "tafeladmin.setup.initialAdmin.enabled=false",
        "tafeladmin.setup.initialAdmin.password=Startpasswort1",
    ],
)
@AutoConfigureTestDatabase(replace = AutoConfigureTestDatabase.Replace.NONE)
class InitialAdminUserServiceExistingEmployeeIT {

    companion object {
        private val postgreSQLContainer: PostgreSQLContainer = PostgreSQLContainer(TEST_POSTGRES_IMAGE)
            .withDatabaseName("tafeladmin-initialadmin-existingemployee")
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
    private lateinit var employeeRepository: EmployeeRepository

    @Autowired
    private lateinit var tafelAdminProperties: TafelAdminProperties

    @Test
    fun `bootstrapping into a database whose employees table already has the configured personnel number succeeds`() {
        val properties = tafelAdminProperties.setup.initialAdmin
        employeeRepository.save(
            EmployeeEntity(
                personnelNumber = properties.personnelNumber,
                firstname = "Pre-existing",
                lastname = "Employee",
            ),
        )
        properties.enabled = true

        initialAdminUserService.run(DefaultApplicationArguments())

        val createdUser = userRepository.findByUsername(properties.username)!!
        assertThat(createdUser.employee.personnelNumber).isEqualTo(properties.personnelNumber)
        assertThat(createdUser.employee.firstname).isEqualTo(properties.firstname)
        assertThat(createdUser.employee.lastname).isEqualTo(properties.lastname)
    }
}
