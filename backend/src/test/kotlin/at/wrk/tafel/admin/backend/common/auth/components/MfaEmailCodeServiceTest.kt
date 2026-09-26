package at.wrk.tafel.admin.backend.common.auth.components

import at.wrk.tafel.admin.backend.common.mail.MailSenderService
import at.wrk.tafel.admin.backend.config.properties.TafelAdminMailProperties
import at.wrk.tafel.admin.backend.config.properties.TafelAdminProperties
import at.wrk.tafel.admin.backend.database.model.auth.MfaEmailCodeEntity
import at.wrk.tafel.admin.backend.database.model.auth.MfaEmailCodeRepository
import at.wrk.tafel.admin.backend.database.model.auth.UserEntity
import at.wrk.tafel.admin.backend.modules.base.exception.BusinessRuleException
import at.wrk.tafel.admin.backend.modules.base.exception.TafelApiException
import io.mockk.every
import io.mockk.impl.annotations.MockK
import io.mockk.junit5.MockKExtension
import io.mockk.slot
import io.mockk.verify
import org.assertj.core.api.Assertions.assertThat
import org.junit.jupiter.api.BeforeEach
import org.junit.jupiter.api.Test
import org.junit.jupiter.api.assertThrows
import org.junit.jupiter.api.extension.ExtendWith
import org.springframework.http.HttpStatus
import org.springframework.mock.env.MockEnvironment
import org.thymeleaf.context.Context
import java.time.Clock
import java.time.Duration
import java.time.Instant
import java.time.LocalDateTime
import java.time.ZoneOffset

@ExtendWith(MockKExtension::class)
class MfaEmailCodeServiceTest {

    @MockK(relaxed = true)
    private lateinit var mfaEmailCodeRepository: MfaEmailCodeRepository

    @MockK(relaxed = true)
    private lateinit var mailSenderService: MailSenderService

    private val properties = TafelAdminProperties().apply { mail = TafelAdminMailProperties() }

    private val clock: Clock = Clock.fixed(Instant.parse("2026-09-24T10:00:00Z"), ZoneOffset.UTC)
    private val now: LocalDateTime = LocalDateTime.now(clock)

    private val environment = MockEnvironment().apply { setActiveProfiles("e2e") }

    private lateinit var service: MfaEmailCodeService
    private lateinit var user: UserEntity

    @BeforeEach
    fun setup() {
        service = MfaEmailCodeService(mfaEmailCodeRepository, mailSenderService, properties, MfaTestCodeGuard(properties, environment), clock)
        user = UserEntity(
            username = "max",
            password = "hash",
            personnelNumber = "1",
            firstname = "Max",
            lastname = "Muster",
            enabled = true,
        ).apply {
            id = 7
            email = "max@example.org"
        }
        every { mfaEmailCodeRepository.save(any<MfaEmailCodeEntity>()) } answers { firstArg() }
    }

    private fun outstanding(code: String, createdAt: LocalDateTime = now.minusMinutes(5), expiresAt: LocalDateTime = now.plusMinutes(5)) = MfaEmailCodeEntity(user, MfaEmailCodeService.hash(7, code), expiresAt).apply { this.createdAt = createdAt }

    @Test
    fun `is only available with a mail configured`() {
        assertThat(service.isAvailable()).isTrue()

        properties.mail = null

        assertThat(service.isAvailable()).isFalse()
    }

    @Test
    fun `sends a six-digit code to the account's address and stores only its hash`() {
        service.send(user)

        val stored = slot<MfaEmailCodeEntity>()
        verify(exactly = 1) { mfaEmailCodeRepository.deleteAllByUserId(7) }
        verify(exactly = 1) { mfaEmailCodeRepository.save(capture(stored)) }

        val context = slot<Context>()
        verify(exactly = 1) {
            mailSenderService.sendHtmlMailTo(
                mailType = any(),
                recipients = listOf("max@example.org"),
                subject = any(),
                attachments = any(),
                templateName = "mails/mfa-code-mail",
                context = capture(context),
            )
        }
        val code = context.captured.getVariable("code") as String
        assertThat(code).matches("\\d{6}")
        assertThat(stored.captured.codeHash).isEqualTo(MfaEmailCodeService.hash(7, code)).isNotEqualTo(code)
        assertThat(stored.captured.expiresAt).isEqualTo(now.plus(Duration.ofMinutes(10)))
        assertThat(context.captured.getVariable("validityMinutes")).isEqualTo(10L)
        assertThat(context.captured.getVariable("username")).isEqualTo("max")
    }

    @Test
    fun `uses the fixed code an end-to-end run configures`() {
        properties.mfa.emailCodeForTests = "424242"

        service.send(user)

        val stored = slot<MfaEmailCodeEntity>()
        verify { mfaEmailCodeRepository.save(capture(stored)) }
        assertThat(stored.captured.codeHash).isEqualTo(MfaEmailCodeService.hash(7, "424242"))
    }

    @Test
    fun `ignores the fixed code outside the test profiles and sends a random one`() {
        environment.setActiveProfiles("prod")
        properties.mfa.emailCodeForTests = "424242"

        service.send(user)

        val stored = slot<MfaEmailCodeEntity>()
        verify { mfaEmailCodeRepository.save(capture(stored)) }
        assertThat(stored.captured.codeHash).isNotEqualTo(MfaEmailCodeService.hash(7, "424242"))
    }

    @Test
    fun `refuses to send another code inside the cooldown, and sends once it is over`() {
        every { mfaEmailCodeRepository.findByUserId(7) } returns outstanding("111111", createdAt = now.minusSeconds(30))

        val exception = assertThrows<TafelApiException> { service.send(user) }
        assertThat(exception.statusCode).isEqualTo(HttpStatus.TOO_MANY_REQUESTS)
        verify(exactly = 0) { mailSenderService.sendHtmlMailTo(any(), any(), any(), any(), any(), any()) }

        every { mfaEmailCodeRepository.findByUserId(7) } returns outstanding("111111", createdAt = now.minusSeconds(61))
        service.send(user)
        verify(exactly = 1) { mailSenderService.sendHtmlMailTo(any(), any(), any(), any(), any(), any()) }
    }

    @Test
    fun `refuses without a mail server or an address`() {
        properties.mail = null
        assertThrows<BusinessRuleException> { service.send(user) }

        properties.mail = TafelAdminMailProperties()
        user.email = "  "
        assertThrows<BusinessRuleException> { service.send(user) }

        verify(exactly = 0) { mailSenderService.sendHtmlMailTo(any(), any(), any(), any(), any(), any()) }
    }

    @Test
    fun `clears expired codes when a new one is asked for`() {
        service.send(user)

        verify(exactly = 1) { mfaEmailCodeRepository.deleteAllExpiredSkipLocked(now) }
    }

    @Test
    fun `accepts the live code once and uses it up`() {
        every { mfaEmailCodeRepository.findByUserId(7) } returns outstanding("123456")

        assertThat(service.consume(7, " 123 456 ")).isTrue()

        verify(exactly = 1) { mfaEmailCodeRepository.deleteAllByUserId(7) }
    }

    @Test
    fun `refuses a wrong code and keeps the live one`() {
        every { mfaEmailCodeRepository.findByUserId(7) } returns outstanding("123456")

        assertThat(service.consume(7, "000000")).isFalse()

        verify(exactly = 0) { mfaEmailCodeRepository.deleteAllByUserId(any()) }
    }

    @Test
    fun `refuses an expired code and removes it`() {
        every { mfaEmailCodeRepository.findByUserId(7) } returns outstanding("123456", expiresAt = now.minusSeconds(1))

        assertThat(service.consume(7, "123456")).isFalse()

        verify(exactly = 1) { mfaEmailCodeRepository.deleteAllByUserId(7) }
    }

    @Test
    fun `refuses when no code is outstanding`() {
        every { mfaEmailCodeRepository.findByUserId(7) } returns null

        assertThat(service.consume(7, "123456")).isFalse()
    }

    @Test
    fun `a code is bound to its user`() {
        assertThat(MfaEmailCodeService.hash(7, "123456")).isNotEqualTo(MfaEmailCodeService.hash(8, "123456"))
    }
}
