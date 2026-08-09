package at.wrk.tafel.admin.backend.common.auth.components

import at.wrk.tafel.admin.backend.common.auth.model.TafelUser
import at.wrk.tafel.admin.backend.common.auth.model.UserPermissions
import at.wrk.tafel.admin.backend.config.properties.TafelAdminProperties
import at.wrk.tafel.admin.backend.database.model.auth.UserRepository
import ch.qos.logback.classic.Level
import ch.qos.logback.classic.Logger
import ch.qos.logback.classic.spi.ILoggingEvent
import ch.qos.logback.core.read.ListAppender
import io.mockk.every
import io.mockk.mockk
import io.mockk.slot
import io.mockk.verify
import org.assertj.core.api.Assertions.assertThat
import org.junit.jupiter.api.AfterEach
import org.junit.jupiter.api.BeforeEach
import org.junit.jupiter.api.Test
import org.junit.jupiter.api.assertThrows
import org.slf4j.LoggerFactory

internal class InitialAdminUserServiceTest {

    private lateinit var userRepository: UserRepository
    private lateinit var userDetailsManager: TafelUserDetailsManager
    private lateinit var tafelPasswordGenerator: TafelPasswordGenerator
    private lateinit var tafelAdminProperties: TafelAdminProperties
    private lateinit var service: InitialAdminUserService

    private lateinit var logAppender: ListAppender<ILoggingEvent>
    private lateinit var logger: Logger

    @BeforeEach
    fun setUp() {
        userRepository = mockk()
        userDetailsManager = mockk(relaxed = true)
        tafelPasswordGenerator = mockk()
        tafelAdminProperties = TafelAdminProperties()

        every { tafelPasswordGenerator.generatePassword() } returns "Generated1"

        service = InitialAdminUserService(
            userRepository = userRepository,
            userDetailsManager = userDetailsManager,
            tafelPasswordGenerator = tafelPasswordGenerator,
            tafelAdminProperties = tafelAdminProperties,
        )

        logger = LoggerFactory.getLogger(InitialAdminUserService::class.java) as Logger
        logAppender = ListAppender<ILoggingEvent>().apply { start() }
        logger.addAppender(logAppender)
    }

    @AfterEach
    fun tearDown() {
        logger.detachAppender(logAppender)
    }

    @Test
    fun `creates an administrator with a generated password when no users exist`() {
        every { userRepository.count() } returns 0

        service.createInitialAdminUserIfMissing()

        val createdUser = slot<TafelUser>()
        verify { userDetailsManager.createUser(capture(createdUser)) }

        val user = createdUser.captured
        assertThat(user.username).isEqualTo("admin")
        assertThat(user.password).isEqualTo("Generated1")
        assertThat(user.enabled).isTrue
        assertThat(user.passwordChangeRequired).isTrue
        assertThat(user.personnelNumber).isEqualTo("00001")
        assertThat(user.firstname).isEqualTo("Tafel")
        assertThat(user.lastname).isEqualTo("Administrator")
        assertThat(user.authorities.map { it.authority })
            .containsExactly(UserPermissions.ADMINISTRATOR.key)
    }

    @Test
    fun `logs the generated password once at warn level`() {
        every { userRepository.count() } returns 0

        service.createInitialAdminUserIfMissing()

        val logEntry = logAppender.list.single { it.level == Level.WARN }
        assertThat(logEntry.formattedMessage).contains("admin", "Generated1")
    }

    @Test
    fun `creates the administrator with the configured values`() {
        every { userRepository.count() } returns 0
        tafelAdminProperties.setup.initialAdmin.apply {
            username = "chef"
            password = "Configured1"
            personnelNumber = "12345"
            firstname = "Erika"
            lastname = "Musterfrau"
        }

        service.createInitialAdminUserIfMissing()

        val createdUser = slot<TafelUser>()
        verify { userDetailsManager.createUser(capture(createdUser)) }
        verify(exactly = 0) { tafelPasswordGenerator.generatePassword() }

        val user = createdUser.captured
        assertThat(user.username).isEqualTo("chef")
        assertThat(user.password).isEqualTo("Configured1")
        assertThat(user.personnelNumber).isEqualTo("12345")
        assertThat(user.firstname).isEqualTo("Erika")
        assertThat(user.lastname).isEqualTo("Musterfrau")
        assertThat(logAppender.list.filter { it.level == Level.WARN }).isEmpty()
    }

    @Test
    fun `does nothing when users already exist`() {
        every { userRepository.count() } returns 1

        service.createInitialAdminUserIfMissing()

        verify(exactly = 0) { userDetailsManager.createUser(any()) }
    }

    @Test
    fun `does nothing when disabled`() {
        tafelAdminProperties.setup.initialAdmin.enabled = false

        service.createInitialAdminUserIfMissing()

        verify(exactly = 0) { userRepository.count() }
        verify(exactly = 0) { userDetailsManager.createUser(any()) }
    }

    @Test
    fun `fails the startup when the configured password is rejected`() {
        every { userRepository.count() } returns 0
        tafelAdminProperties.setup.initialAdmin.password = "short"
        every { userDetailsManager.createUser(any()) } throws
            PasswordChangeException("Das neue Passwort ist ungültig!", listOf("Mindestlänge: 8, Maximale Länge: 50"))

        val exception = assertThrows<IllegalStateException> { service.createInitialAdminUserIfMissing() }

        assertThat(exception).hasMessageContaining("Das neue Passwort ist ungültig!")
        assertThat(exception).hasMessageContaining("Mindestlänge: 8, Maximale Länge: 50")
    }
}
