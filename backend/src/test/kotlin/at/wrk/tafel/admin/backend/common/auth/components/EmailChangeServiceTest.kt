package at.wrk.tafel.admin.backend.common.auth.components

import at.wrk.tafel.admin.backend.common.mail.MailSenderService
import at.wrk.tafel.admin.backend.common.test.TestdataGenerator.createUser
import at.wrk.tafel.admin.backend.config.properties.TafelAdminMailProperties
import at.wrk.tafel.admin.backend.config.properties.TafelAdminProperties
import at.wrk.tafel.admin.backend.database.model.auth.EmailChangeTokenEntity
import at.wrk.tafel.admin.backend.database.model.auth.EmailChangeTokenRepository
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
import java.time.Instant
import java.time.LocalDateTime
import java.time.ZoneId
import java.util.Optional

class EmailChangeServiceTest {

    private val tokenRepository = mockk<EmailChangeTokenRepository>(relaxed = true)
    private val userRepository = mockk<UserRepository>(relaxed = true)
    private val mailSenderService = mockk<MailSenderService>(relaxed = true)
    private val notificationService = mockk<AccountSecurityNotificationService>(relaxed = true)
    private val clock: Clock = Clock.fixed(Instant.parse("2026-10-15T10:00:00Z"), ZoneId.of("UTC"))
    private val now = LocalDateTime.now(clock)

    private val properties = TafelAdminProperties().apply {
        mail = TafelAdminMailProperties().apply { from = "tafel@example.org" }
        server.publicUrl = "https://tafel.example.org/verwaltung"
    }

    private lateinit var service: EmailChangeService
    private lateinit var user: UserEntity

    @BeforeEach
    fun beforeEach() {
        service = EmailChangeService(tokenRepository, userRepository, mailSenderService, notificationService, properties, clock)
        user = createUser().apply {
            id = 7
            email = "old@example.org"
        }
        every { userRepository.findById(7) } returns Optional.of(user)
        every { tokenRepository.save(any<EmailChangeTokenEntity>()) } answers { firstArg() }
        every { userRepository.save(any<UserEntity>()) } answers { firstArg() }
    }

    @Test
    fun `only a change from one address to another needs a confirmation, and only where links can be mailed`() {
        assertThat(service.needsConfirmation("old@example.org", "new@example.org")).isTrue()
        assertThat(service.needsConfirmation("old@example.org", "OLD@example.org")).isFalse()
        assertThat(service.needsConfirmation(null, "new@example.org")).isFalse()
        assertThat(service.needsConfirmation("old@example.org", null)).isFalse()

        properties.server.publicUrl = null
        assertThat(service.needsConfirmation("old@example.org", "new@example.org")).isFalse()
    }

    @Test
    fun `a request mails a link to the current address and stores only the hash`() {
        val saved = slot<EmailChangeTokenEntity>()
        every { tokenRepository.save(capture(saved)) } answers { firstArg() }
        val context = slot<Context>()

        service.request(7, "new@example.org")

        verify { tokenRepository.deleteAllByUserId(7) }
        verify {
            mailSenderService.sendHtmlMailTo(
                mailType = any(),
                recipients = listOf("old@example.org"),
                subject = any(),
                attachments = any(),
                templateName = "mails/email-change-mail",
                context = capture(context),
            )
        }
        val link = context.captured.getVariable("link") as String
        assertThat(link).startsWith("https://tafel.example.org/verwaltung/e-mail-bestaetigen#token=")
        assertThat(context.captured.getVariable("newEmail")).isEqualTo("new@example.org")
        assertThat(saved.captured.tokenHash).isEqualTo(SingleUseToken.hash(link.substringAfter("#token=")))
        assertThat(saved.captured.oldEmail).isEqualTo("old@example.org")
        assertThat(saved.captured.expiresAt).isEqualTo(now.plusHours(1))
        assertThat(user.email).isEqualTo("old@example.org")
    }

    @Test
    fun `a confirmed link sets the new address and tells the old one`() {
        val stored = EmailChangeTokenEntity(user, "old@example.org", "new@example.org", SingleUseToken.hash("t"), now.plusMinutes(5))
        every { tokenRepository.findByTokenHash(SingleUseToken.hash("t")) } returns stored

        service.confirm("t")

        assertThat(user.email).isEqualTo("new@example.org")
        verify { tokenRepository.delete(stored) }
        verify { notificationService.notify(user.username, "old@example.org", match { it.contains("new@example.org") }) }
    }

    @Test
    fun `an unknown or expired link, a disabled account and a changed address are all an invalid link`() {
        assertThrows<InvalidEmailChangeLinkException> { service.confirm("unknown") }

        every { tokenRepository.findByTokenHash(SingleUseToken.hash("expired")) } returns
            EmailChangeTokenEntity(user, "old@example.org", "new@example.org", "h", now.minusSeconds(1))
        assertThrows<InvalidEmailChangeLinkException> { service.confirm("expired") }

        every { tokenRepository.findByTokenHash(SingleUseToken.hash("changed")) } returns
            EmailChangeTokenEntity(user, "older@example.org", "new@example.org", "h", now.plusMinutes(5))
        assertThrows<InvalidEmailChangeLinkException> { service.confirm("changed") }

        val disabled = createUser().apply {
            id = 8
            email = "old@example.org"
            enabled = false
        }
        every { tokenRepository.findByTokenHash(SingleUseToken.hash("disabled")) } returns
            EmailChangeTokenEntity(disabled, "old@example.org", "new@example.org", "h", now.plusMinutes(5))
        assertThrows<InvalidEmailChangeLinkException> { service.confirm("disabled") }

        assertThat(user.email).isEqualTo("old@example.org")
        assertThat(disabled.email).isEqualTo("old@example.org")
    }

    @Test
    fun `the pending address is shown only while the link is still valid`() {
        every { tokenRepository.findByUserId(7) } returns
            EmailChangeTokenEntity(user, "old@example.org", "new@example.org", "h", now.plusMinutes(5))
        assertThat(service.pendingEmail(7)).isEqualTo("new@example.org")

        every { tokenRepository.findByUserId(7) } returns
            EmailChangeTokenEntity(user, "old@example.org", "new@example.org", "h", now.minusMinutes(5))
        assertThat(service.pendingEmail(7)).isNull()
        assertThat(service.pendingEmail(null)).isNull()
    }
}
