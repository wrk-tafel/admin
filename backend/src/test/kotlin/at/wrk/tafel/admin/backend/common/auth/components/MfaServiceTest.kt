package at.wrk.tafel.admin.backend.common.auth.components

import at.wrk.tafel.admin.backend.common.auth.model.MfaMethod
import at.wrk.tafel.admin.backend.config.properties.TafelAdminProperties
import at.wrk.tafel.admin.backend.database.model.auth.UserEntity
import at.wrk.tafel.admin.backend.database.model.auth.UserRepository
import at.wrk.tafel.admin.backend.database.model.base.EmployeeEntity
import at.wrk.tafel.admin.backend.modules.base.exception.BusinessRuleException
import at.wrk.tafel.admin.backend.modules.base.exception.ConflictException
import at.wrk.tafel.admin.backend.modules.base.exception.NotFoundException
import io.mockk.every
import io.mockk.impl.annotations.MockK
import io.mockk.junit5.MockKExtension
import io.mockk.verify
import org.assertj.core.api.Assertions.assertThat
import org.junit.jupiter.api.BeforeEach
import org.junit.jupiter.api.Test
import org.junit.jupiter.api.assertThrows
import org.junit.jupiter.api.extension.ExtendWith
import java.util.Optional

@ExtendWith(MockKExtension::class)
class MfaServiceTest {

    @MockK(relaxed = true)
    private lateinit var userRepository: UserRepository

    @MockK(relaxed = true)
    private lateinit var totpService: TotpService

    @MockK(relaxed = true)
    private lateinit var mfaEmailCodeService: MfaEmailCodeService

    @MockK(relaxed = true)
    private lateinit var loginAttemptService: LoginAttemptService

    @MockK(relaxed = true)
    private lateinit var notificationService: AccountSecurityNotificationService

    private val properties = TafelAdminProperties()

    private lateinit var service: MfaService
    private lateinit var user: UserEntity

    private val attemptKey = "mfa:max"

    @BeforeEach
    fun setup() {
        service = MfaService(userRepository, totpService, mfaEmailCodeService, loginAttemptService, properties, notificationService)
        user = UserEntity(
            username = "max",
            password = "hash",
            employee = EmployeeEntity(personnelNumber = "1", firstname = "Max", lastname = "Muster"),
            enabled = true,
        ).apply {
            id = 7
            email = "max@example.org"
        }
        properties.mfa.required = false
        properties.environmentLabel = ""

        every { userRepository.findByUsername("max") } returns user
        every { userRepository.findById(7) } returns Optional.of(user)
        every { userRepository.save(any<UserEntity>()) } answers { firstArg() }
        every { loginAttemptService.isLocked(any()) } returns false
        every { totpService.matchingStep("SECRET", "123456") } returns 100L
        every { totpService.matchingStep("SECRET", "000000") } returns null
        every { userRepository.advanceMfaStep(7, 100L) } returns 1
        every { mfaEmailCodeService.consume(7, "654321") } returns true
        every { mfaEmailCodeService.consume(7, "000000") } returns false
        every { mfaEmailCodeService.isAvailable() } returns true
    }

    private fun appOn() {
        user.mfaSecret = "SECRET"
        user.mfaTotpEnabled = true
    }

    private fun emailOn() {
        user.mfaEmailEnabled = true
    }

    // ---- status

    @Test
    fun `the status says which methods are on, whether the deployment requires one and whether e-mail can be offered`() {
        appOn()
        properties.mfa.required = true
        user.email = "max@example.org"
        every { mfaEmailCodeService.isAvailable() } returns false

        val status = service.getStatus("max")

        assertThat(status.totpEnabled).isTrue()
        assertThat(status.emailEnabled).isFalse()
        assertThat(status.required).isTrue()
        assertThat(status.emailAvailable).isFalse()
        assertThat(status.emailAddress).isEqualTo("max@example.org")
    }

    @Test
    fun `the status has no address when none is on the account - the page then sends the user to set one`() {
        user.email = " "

        val status = service.getStatus("max")

        assertThat(status.emailAddress).isNull()
    }

    // ---- authenticator app

    @Test
    fun `starting the app setup stores a new secret that does not count yet and returns the address for the QR code`() {
        every { totpService.generateSecret() } returns "NEWSECRET"
        every { totpService.otpauthUri("Tafel Admin", "max", "NEWSECRET") } returns "otpauth://totp/x"

        val setup = service.startSetup("max")

        assertThat(setup.secret).isEqualTo("NEWSECRET")
        assertThat(setup.otpauthUri).isEqualTo("otpauth://totp/x")
        assertThat(user.mfaSecret).isEqualTo("NEWSECRET")
        assertThat(user.mfaTotpEnabled).isFalse()
    }

    @Test
    fun `the app setup cannot be restarted while the app is on, so a session cannot swap the secret`() {
        appOn()

        assertThrows<ConflictException> { service.startSetup("max") }

        assertThat(user.mfaSecret).isEqualTo("SECRET")
        verify(exactly = 0) { userRepository.save(any()) }
    }

    @Test
    fun `a valid app code switches the app on`() {
        user.mfaSecret = "SECRET"

        assertThat(service.enable("max", "123456")).isTrue()

        assertThat(user.mfaTotpEnabled).isTrue()
        verify(exactly = 1) { loginAttemptService.deleteAttempts(attemptKey) }
    }

    @Test
    fun `a wrong app code does not switch it on and is counted`() {
        user.mfaSecret = "SECRET"

        assertThat(service.enable("max", "000000")).isFalse()

        assertThat(user.mfaTotpEnabled).isFalse()
        verify(exactly = 1) { loginAttemptService.recordFailure(attemptKey) }
        verify(exactly = 0) { userRepository.advanceMfaStep(any(), any()) }
    }

    @Test
    fun `switching the app on is mailed to the user`() {
        user.mfaSecret = "SECRET"

        service.enable("max", "123456")

        verify(exactly = 1) { notificationService.notify("max", "max@example.org", match { it.contains("Authenticator-App") && it.contains("eingeschaltet") }) }
    }

    // A session left open must not be able to put its own second factor next to the user's.
    @Test
    fun `a user who has the e-mail method needs one of its codes to add the app`() {
        emailOn()
        user.mfaSecret = "NEWSECRET"
        every { totpService.matchingStep("NEWSECRET", "123456") } returns 100L

        assertThat(service.enable("max", "123456")).isFalse()
        assertThat(service.enable("max", "123456", currentCode = " ")).isFalse()
        assertThat(user.mfaTotpEnabled).isFalse()
        // no code was given, so nothing was guessed and nothing is counted
        verify(exactly = 0) { loginAttemptService.recordFailure(any()) }
        verify(exactly = 0) { notificationService.notify(any(), any(), any()) }

        assertThat(service.enable("max", "123456", currentCode = "000000")).isFalse()
        assertThat(user.mfaTotpEnabled).isFalse()
        verify(exactly = 1) { loginAttemptService.recordFailure(attemptKey) }

        assertThat(service.enable("max", "123456", currentCode = "654321")).isTrue()
        assertThat(user.mfaTotpEnabled).isTrue()
    }

    @Test
    fun `the secret being set up cannot vouch for itself while the user has another method`() {
        emailOn()
        user.mfaSecret = "NEWSECRET"
        every { totpService.matchingStep("NEWSECRET", "111111") } returns 100L

        // the new secret's code as the "current" code: the e-mail method is what has to be proven
        assertThat(service.enable("max", "111111", currentCode = "111111")).isFalse()

        assertThat(user.mfaTotpEnabled).isFalse()
    }

    @Test
    fun `enabling the app needs a started setup and is refused when it is on already`() {
        assertThrows<BusinessRuleException> { service.enable("max", "123456") }

        appOn()
        assertThrows<ConflictException> { service.enable("max", "123456") }
    }

    // ---- e-mail

    @Test
    fun `starting the e-mail setup sends a code`() {
        service.startEmailSetup("max")

        verify(exactly = 1) { mfaEmailCodeService.send(user) }
    }

    @Test
    fun `the e-mail setup is refused while the method is on`() {
        emailOn()

        assertThrows<ConflictException> { service.startEmailSetup("max") }
        assertThrows<ConflictException> { service.enableEmail("max", "654321") }

        verify(exactly = 0) { mfaEmailCodeService.send(any()) }
    }

    @Test
    fun `the code that was sent switches the e-mail method on`() {
        assertThat(service.enableEmail("max", "654321")).isTrue()

        assertThat(user.mfaEmailEnabled).isTrue()
        verify(exactly = 1) { loginAttemptService.deleteAttempts(attemptKey) }
        // the app was not asked
        verify(exactly = 0) { totpService.matchingStep(any(), any()) }
    }

    @Test
    fun `switching the e-mail method on is mailed to the user`() {
        service.enableEmail("max", "654321")

        verify(exactly = 1) { notificationService.notify("max", "max@example.org", match { it.contains("E-Mail") && it.contains("eingeschaltet") }) }
    }

    @Test
    fun `a user who has the app needs one of its codes to add the e-mail method`() {
        appOn()

        assertThat(service.enableEmail("max", "654321")).isFalse()
        assertThat(user.mfaEmailEnabled).isFalse()
        // the e-mailed code was not even consumed
        verify(exactly = 0) { mfaEmailCodeService.consume(any(), any()) }

        assertThat(service.enableEmail("max", "654321", currentCode = "000000")).isFalse()
        assertThat(user.mfaEmailEnabled).isFalse()

        assertThat(service.enableEmail("max", "654321", currentCode = "123456")).isTrue()
        assertThat(user.mfaEmailEnabled).isTrue()
    }

    @Test
    fun `a wrong e-mailed code does not switch the method on and is counted`() {
        assertThat(service.enableEmail("max", "000000")).isFalse()

        assertThat(user.mfaEmailEnabled).isFalse()
        verify(exactly = 1) { loginAttemptService.recordFailure(attemptKey) }
    }

    @Test
    fun `a login code can only be sent to a user who has the e-mail method on`() {
        assertThrows<BusinessRuleException> { service.sendLoginCode("max") }

        emailOn()
        service.sendLoginCode("max")

        verify(exactly = 1) { mfaEmailCodeService.send(user) }
    }

    // ---- login

    @Test
    fun `an app code completes a login`() {
        appOn()

        assertThat(service.verifyLogin("max", "123456")).isTrue()

        verify(exactly = 1) { userRepository.advanceMfaStep(7, 100L) }
        verify(exactly = 1) { loginAttemptService.deleteAttempts(attemptKey) }
        verify(exactly = 0) { loginAttemptService.recordFailure(any()) }
    }

    @Test
    fun `an e-mailed code completes a login`() {
        emailOn()

        assertThat(service.verifyLogin("max", "654321")).isTrue()

        verify(exactly = 1) { loginAttemptService.deleteAttempts(attemptKey) }
    }

    @Test
    fun `with both methods either code completes a login`() {
        appOn()
        emailOn()

        assertThat(service.verifyLogin("max", "123456")).isTrue()
        assertThat(service.verifyLogin("max", "654321")).isTrue()
    }

    @Test
    fun `a wrong code fails a login once, however many methods it was tried against`() {
        appOn()
        emailOn()

        assertThat(service.verifyLogin("max", "000000")).isFalse()

        verify(exactly = 1) { loginAttemptService.recordFailure(attemptKey) }
    }

    @Test
    fun `an app code that was used already is refused even though it is correct`() {
        appOn()
        every { userRepository.advanceMfaStep(7, 100L) } returns 0

        assertThat(service.verifyLogin("max", "123456")).isFalse()

        verify(exactly = 1) { loginAttemptService.recordFailure(attemptKey) }
    }

    @Test
    fun `a locked-out account is refused without looking at any code`() {
        appOn()
        emailOn()
        every { loginAttemptService.isLocked(attemptKey) } returns true

        assertThat(service.verifyLogin("max", "123456")).isFalse()

        verify(exactly = 0) { totpService.matchingStep(any(), any()) }
        verify(exactly = 0) { mfaEmailCodeService.consume(any(), any()) }
        verify(exactly = 0) { loginAttemptService.recordFailure(any()) }
    }

    @Test
    fun `a user with no method has no second step to complete`() {
        user.mfaSecret = "SECRET"

        assertThat(service.verifyLogin("max", "123456")).isFalse()

        verify(exactly = 0) { userRepository.advanceMfaStep(any(), any()) }
        verify(exactly = 0) { mfaEmailCodeService.consume(any(), any()) }
    }

    // ---- confirming an existing factor

    @Test
    fun `a code of a method the user has confirms them - one they have none of does not`() {
        assertThat(service.confirm("max", "123456")).isFalse()

        appOn()
        assertThat(service.confirm("max", "123456")).isTrue()
        assertThat(service.confirm("max", null)).isFalse()
        assertThat(service.confirm("max", "000000")).isFalse()
    }

    // ---- switching off

    @Test
    fun `switching the app off needs a valid code and clears its secret`() {
        appOn()

        assertThat(service.disable("max", MfaMethod.TOTP, "000000")).isFalse()
        assertThat(user.mfaTotpEnabled).isTrue()

        assertThat(service.disable("max", MfaMethod.TOTP, "123456")).isTrue()
        assertThat(user.mfaTotpEnabled).isFalse()
        assertThat(user.mfaSecret).isNull()
        verify(exactly = 1) { userRepository.clearMfaStep(7) }
        verify(exactly = 1) { notificationService.notify("max", "max@example.org", match { it.contains("Authenticator-App") && it.contains("ausgeschaltet") }) }
    }

    @Test
    fun `switching e-mail off drops the outstanding code`() {
        emailOn()

        assertThat(service.disable("max", MfaMethod.EMAIL, "654321")).isTrue()

        assertThat(user.mfaEmailEnabled).isFalse()
        verify(exactly = 1) { mfaEmailCodeService.discard(7) }
    }

    @Test
    fun `a method is switched off with a code of the other one`() {
        appOn()
        emailOn()

        assertThat(service.disable("max", MfaMethod.EMAIL, "123456")).isTrue()

        assertThat(user.mfaEmailEnabled).isFalse()
        assertThat(user.mfaTotpEnabled).isTrue()
    }

    @Test
    fun `switching off a method that is not on does nothing`() {
        assertThat(service.disable("max", MfaMethod.TOTP, "123456")).isFalse()
        assertThat(service.disable("max", MfaMethod.EMAIL, "654321")).isFalse()

        verify(exactly = 0) { userRepository.save(any()) }
    }

    @Test
    fun `the last method cannot be switched off while the deployment requires one - and the code is not even looked at`() {
        properties.mfa.required = true
        appOn()

        assertThrows<ConflictException> { service.disable("max", MfaMethod.TOTP, "123456") }

        assertThat(user.mfaTotpEnabled).isTrue()
        verify(exactly = 0) { totpService.matchingStep(any(), any()) }
        verify(exactly = 0) { loginAttemptService.recordFailure(any()) }
    }

    @Test
    fun `one of two methods can be switched off while the deployment requires one`() {
        properties.mfa.required = true
        appOn()
        emailOn()

        assertThat(service.disable("max", MfaMethod.EMAIL, "123456")).isTrue()
    }

    // ---- administrator

    @Test
    fun `an administrator's reset clears both methods without a code and lifts the lockout`() {
        appOn()
        emailOn()

        service.reset(7)

        assertThat(user.mfaTotpEnabled).isFalse()
        assertThat(user.mfaEmailEnabled).isFalse()
        assertThat(user.mfaSecret).isNull()
        verify(exactly = 1) { userRepository.clearMfaStep(7) }
        verify(exactly = 1) { mfaEmailCodeService.discard(7) }
        verify(exactly = 1) { loginAttemptService.deleteAttempts(attemptKey) }
        verify(exactly = 1) { notificationService.notify("max", "max@example.org", match { it.contains("Administrator") }) }
    }

    @Test
    fun `resetting an unknown user is a not-found`() {
        every { userRepository.findById(99) } returns Optional.empty()

        assertThrows<NotFoundException> { service.reset(99) }
    }

    @Test
    fun `an unknown username is a not-found`() {
        every { userRepository.findByUsername("nobody") } returns null

        assertThrows<NotFoundException> { service.getStatus("nobody") }
    }
}
