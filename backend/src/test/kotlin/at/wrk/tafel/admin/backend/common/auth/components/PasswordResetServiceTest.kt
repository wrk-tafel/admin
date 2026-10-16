package at.wrk.tafel.admin.backend.common.auth.components

import at.wrk.tafel.admin.backend.common.mail.MailSenderService
import at.wrk.tafel.admin.backend.common.test.TestdataGenerator.createUser
import at.wrk.tafel.admin.backend.config.properties.TafelAdminMailProperties
import at.wrk.tafel.admin.backend.config.properties.TafelAdminProperties
import at.wrk.tafel.admin.backend.database.model.auth.PasswordResetTokenEntity
import at.wrk.tafel.admin.backend.database.model.auth.PasswordResetTokenRepository
import at.wrk.tafel.admin.backend.database.model.auth.UserEntity
import at.wrk.tafel.admin.backend.database.model.auth.UserRepository
import io.mockk.every
import io.mockk.mockk
import io.mockk.slot
import io.mockk.verify
import org.assertj.core.api.Assertions.assertThat
import org.junit.jupiter.api.BeforeEach
import org.junit.jupiter.api.Test
import org.junit.jupiter.api.assertThrows
import org.thymeleaf.context.Context
import java.time.Clock
import java.time.Duration
import java.time.Instant
import java.time.LocalDateTime
import java.time.ZoneId

class PasswordResetServiceTest {

    private val userRepository = mockk<UserRepository>(relaxed = true)
    private val tokenRepository = mockk<PasswordResetTokenRepository>(relaxed = true)
    private val userDetailsManager = mockk<TafelUserDetailsManager>(relaxed = true)
    private val mailSenderService = mockk<MailSenderService>(relaxed = true)
    private val notificationService = mockk<AccountSecurityNotificationService>(relaxed = true)
    private val clock: Clock = Clock.fixed(Instant.parse("2026-10-15T10:00:00Z"), ZoneId.of("UTC"))
    private val now = LocalDateTime.now(clock)

    private val properties = TafelAdminProperties().apply {
        mail = TafelAdminMailProperties().apply { from = "tafel@example.org" }
        server.publicUrl = "https://tafel.example.org/verwaltung/"
    }

    private lateinit var service: PasswordResetService
    private lateinit var user: UserEntity

    @BeforeEach
    fun beforeEach() {
        service = PasswordResetService(
            userRepository,
            tokenRepository,
            userDetailsManager,
            mailSenderService,
            notificationService,
            properties,
            clock,
        )
        user = createUser().apply {
            id = 7
            email = "max@example.org"
        }
        every { userRepository.findByUsername(any()) } returns null
        every { userRepository.findAllByEmailIgnoreCase(any()) } returns emptyList()
        every { tokenRepository.findFirstByUserIdOrderByCreatedAtDesc(any()) } returns null
        every { tokenRepository.save(any<PasswordResetTokenEntity>()) } answers { firstArg() }
    }

    @Test
    fun `is available only with mail and a public url`() {
        assertThat(service.isAvailable()).isTrue()

        properties.server.publicUrl = " "
        assertThat(service.isAvailable()).isFalse()

        properties.server.publicUrl = "https://tafel.example.org"
        properties.mail = null
        assertThat(service.isAvailable()).isFalse()
    }

    @Test
    fun `a request by username mails a link with the token in the fragment and stores only its hash`() {
        every { userRepository.findByUsername(user.username) } returns user
        val savedToken = slot<PasswordResetTokenEntity>()
        every { tokenRepository.save(capture(savedToken)) } answers { firstArg() }
        val context = slot<Context>()

        service.request("  ${user.username} ")

        verify { tokenRepository.deleteAllByUserId(7) }
        verify {
            mailSenderService.sendHtmlMailTo(
                mailType = any(),
                recipients = listOf("max@example.org"),
                subject = "Passwort zurücksetzen",
                attachments = any(),
                templateName = "mails/password-reset-mail",
                context = capture(context),
            )
        }
        val link = context.captured.getVariable("link") as String
        assertThat(link).startsWith("https://tafel.example.org/verwaltung/passwort-zuruecksetzen#token=")
        val token = link.substringAfter("#token=")
        assertThat(savedToken.captured.tokenHash).isEqualTo(SingleUseToken.hash(token)).isNotEqualTo(token)
        assertThat(savedToken.captured.expiresAt).isEqualTo(now.plusHours(1))
        assertThat(context.captured.getVariable("validityMinutes")).isEqualTo(60L)
    }

    @Test
    fun `a request by e-mail address reaches every enabled account holding it`() {
        val other = createUser().apply {
            id = 8
            email = "MAX@example.org"
        }
        every { userRepository.findAllByEmailIgnoreCase("max@example.org") } returns listOf(user, other)

        service.request("max@example.org")

        verify(exactly = 2) { mailSenderService.sendHtmlMailTo(any(), any(), any(), any(), any(), any()) }
    }

    @Test
    fun `an unknown identifier, an account without an address and a disabled account send nothing`() {
        service.request("nobody")

        every { userRepository.findByUsername("no-address") } returns createUser().apply { id = 9 }
        service.request("no-address")

        every { userRepository.findByUsername("disabled") } returns createUser().apply {
            id = 10
            email = "disabled@example.org"
            enabled = false
        }
        service.request("disabled")

        verify(exactly = 0) { mailSenderService.sendHtmlMailTo(any(), any(), any(), any(), any(), any()) }
        verify(exactly = 0) { tokenRepository.save(any()) }
    }

    @Test
    fun `nothing is sent while the feature is switched off`() {
        properties.server.publicUrl = null
        every { userRepository.findByUsername(user.username) } returns user

        service.request(user.username)

        verify(exactly = 0) { mailSenderService.sendHtmlMailTo(any(), any(), any(), any(), any(), any()) }
    }

    @Test
    fun `a further request within the cooldown is not sent`() {
        every { userRepository.findByUsername(user.username) } returns user
        every { tokenRepository.findFirstByUserIdOrderByCreatedAtDesc(7) } returns
            PasswordResetTokenEntity(user, "hash", now.plusMinutes(59)).apply { createdAt = now.minusSeconds(30) }

        service.request(user.username)

        verify(exactly = 0) { mailSenderService.sendHtmlMailTo(any(), any(), any(), any(), any(), any()) }
    }

    @Test
    fun `a request after the cooldown replaces the earlier link`() {
        properties.passwordReset.requestCooldown = Duration.ofMinutes(1)
        every { userRepository.findByUsername(user.username) } returns user
        every { tokenRepository.findFirstByUserIdOrderByCreatedAtDesc(7) } returns
            PasswordResetTokenEntity(user, "old-hash", now.plusMinutes(50)).apply { createdAt = now.minusMinutes(10) }

        service.request(user.username)

        verify { tokenRepository.deleteAllByUserId(7) }
        verify(exactly = 1) { mailSenderService.sendHtmlMailTo(any(), any(), any(), any(), any(), any()) }
    }

    @Test
    fun `a valid token sets the password, is used up and the owner is told`() {
        val stored = PasswordResetTokenEntity(user, SingleUseToken.hash("the-token"), now.plusMinutes(30))
        every { tokenRepository.findByTokenHash(SingleUseToken.hash("the-token")) } returns stored

        service.confirm("the-token", "aNewSecretPassword-123")

        verify { userDetailsManager.resetPassword(user, "aNewSecretPassword-123") }
        assertThat(stored.usedAt).isEqualTo(now)
        verify { notificationService.notify(user.username, "max@example.org", any()) }
    }

    @Test
    fun `an unknown, expired or used token and a disabled account are all an invalid link`() {
        assertThrows<InvalidResetLinkException> { service.confirm("unknown", "aNewSecretPassword-123") }

        every { tokenRepository.findByTokenHash(SingleUseToken.hash("expired")) } returns
            PasswordResetTokenEntity(user, "h", now.minusSeconds(1))
        assertThrows<InvalidResetLinkException> { service.confirm("expired", "aNewSecretPassword-123") }

        every { tokenRepository.findByTokenHash(SingleUseToken.hash("used")) } returns
            PasswordResetTokenEntity(user, "h", now.plusMinutes(30)).apply { usedAt = now.minusMinutes(1) }
        assertThrows<InvalidResetLinkException> { service.confirm("used", "aNewSecretPassword-123") }

        val disabled = createUser().apply {
            id = 11
            enabled = false
        }
        every { tokenRepository.findByTokenHash(SingleUseToken.hash("disabled")) } returns
            PasswordResetTokenEntity(disabled, "h", now.plusMinutes(30))
        assertThrows<InvalidResetLinkException> { service.confirm("disabled", "aNewSecretPassword-123") }

        verify(exactly = 0) { userDetailsManager.resetPassword(any(), any()) }
    }

    @Test
    fun `a password the policy refuses leaves the token unused`() {
        val stored = PasswordResetTokenEntity(user, SingleUseToken.hash("the-token"), now.plusMinutes(30))
        every { tokenRepository.findByTokenHash(SingleUseToken.hash("the-token")) } returns stored
        every { userDetailsManager.resetPassword(user, "short") } throws PasswordChangeException("Das neue Passwort ist ungültig!")

        assertThrows<PasswordChangeException> { service.confirm("the-token", "short") }

        assertThat(stored.usedAt).isNull()
    }
}
