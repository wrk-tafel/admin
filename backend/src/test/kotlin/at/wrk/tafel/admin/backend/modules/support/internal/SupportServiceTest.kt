package at.wrk.tafel.admin.backend.modules.support.internal

import at.wrk.tafel.admin.backend.common.mail.MailSenderService
import at.wrk.tafel.admin.backend.config.properties.TafelAdminProperties
import at.wrk.tafel.admin.backend.config.properties.TafelAdminSupportProperties
import at.wrk.tafel.admin.backend.modules.base.exception.TafelApiException
import at.wrk.tafel.admin.backend.modules.support.model.SupportClientContext
import at.wrk.tafel.admin.backend.modules.support.model.SupportClientLogItem
import at.wrk.tafel.admin.backend.modules.support.model.SupportRequest
import io.mockk.impl.annotations.RelaxedMockK
import io.mockk.junit5.MockKExtension
import io.mockk.slot
import io.mockk.verify
import org.assertj.core.api.Assertions.assertThat
import org.assertj.core.api.Assertions.assertThatThrownBy
import org.junit.jupiter.api.AfterEach
import org.junit.jupiter.api.BeforeEach
import org.junit.jupiter.api.Test
import org.junit.jupiter.api.extension.ExtendWith
import org.springframework.http.HttpStatus
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken
import org.springframework.security.core.context.SecurityContextHolder
import org.thymeleaf.context.Context
import java.time.Clock
import java.time.Instant
import java.time.ZoneId

@ExtendWith(MockKExtension::class)
class SupportServiceTest {

    @RelaxedMockK
    private lateinit var mailSenderService: MailSenderService

    private val clock = Clock.fixed(Instant.parse("2026-03-22T09:15:30Z"), ZoneId.of("Europe/Vienna"))

    @BeforeEach
    fun beforeEach() {
        SecurityContextHolder.getContext().authentication =
            UsernamePasswordAuthenticationToken("test-user", null, emptyList())
    }

    @AfterEach
    fun afterEach() {
        SecurityContextHolder.clearContext()
    }

    @Test
    fun `sends the request to the configured recipients`() {
        val service = SupportService(propertiesWithRecipients("support1@localhost", "support2@localhost"), mailSenderService, clock)

        service.sendSupportRequest(SupportRequest(title = "Something is broken", text = "more details"))

        val recipientsSlot = slot<List<String>>()
        val subjectSlot = slot<String>()
        val contextSlot = slot<Context>()
        verify(exactly = 1) {
            mailSenderService.sendHtmlMailTo(
                recipients = capture(recipientsSlot),
                subject = capture(subjectSlot),
                attachments = emptyList(),
                templateName = "mails/support-request-mail",
                context = capture(contextSlot),
            )
        }

        assertThat(recipientsSlot.captured).containsExactly("support1@localhost", "support2@localhost")
        assertThat(subjectSlot.captured).isEqualTo("Support-Anfrage: Something is broken")
        assertThat(contextSlot.captured.getVariable("supportTitle")).isEqualTo("Something is broken")
        assertThat(contextSlot.captured.getVariable("supportText")).isEqualTo("more details")
    }

    @Test
    fun `collects reporter, build and browser context as diagnostics`() {
        val properties = propertiesWithRecipients("support@localhost").apply {
            version = "1.2.3"
            buildTime = "2026-03-20T10:00:00Z"
            environmentLabel = "TEST"
        }
        val service = SupportService(properties, mailSenderService, clock)

        service.sendSupportRequest(
            SupportRequest(
                title = "Something is broken",
                text = "more details",
                clientContext = SupportClientContext(
                    page = "http://localhost/kunden/suchen",
                    userAgent = "Mozilla/5.0",
                    viewport = "1280x800",
                    screen = "1920x1080",
                    language = "de-AT",
                    timeZone = "Europe/Vienna",
                    recentErrors = listOf(
                        SupportClientLogItem(timestamp = "10:15:00", message = "HTTP 500 - GET /api/households"),
                    ),
                ),
            ),
        )

        val contextSlot = slot<Context>()
        verify { mailSenderService.sendHtmlMailTo(any(), any(), any(), any(), capture(contextSlot)) }

        val diagnostics = contextSlot.captured.getVariable("diagnostics") as SupportDiagnostics
        assertThat(diagnostics).isEqualTo(
            SupportDiagnostics(
                username = "test-user",
                reportedAt = "22.03.2026 10:15:30",
                version = "1.2.3",
                buildTime = "2026-03-20T10:00:00Z",
                environmentLabel = "TEST",
                page = "http://localhost/kunden/suchen",
                userAgent = "Mozilla/5.0",
                viewport = "1280x800",
                screen = "1920x1080",
                language = "de-AT",
                timeZone = "Europe/Vienna",
                recentErrors = listOf(
                    SupportDiagnosticsError(timestamp = "10:15:00", message = "HTTP 500 - GET /api/households"),
                ),
            ),
        )
    }

    @Test
    fun `diagnostics stay complete when the browser reported nothing`() {
        val service = SupportService(propertiesWithRecipients("support@localhost"), mailSenderService, clock)

        service.sendSupportRequest(SupportRequest(title = "Something is broken", text = "more details"))

        val contextSlot = slot<Context>()
        verify { mailSenderService.sendHtmlMailTo(any(), any(), any(), any(), capture(contextSlot)) }

        val diagnostics = contextSlot.captured.getVariable("diagnostics") as SupportDiagnostics
        assertThat(diagnostics.username).isEqualTo("test-user")
        assertThat(diagnostics.reportedAt).isEqualTo("22.03.2026 10:15:30")
        // an unset environmentLabel is production - reading a report as "no environment" would be worse
        assertThat(diagnostics.environmentLabel).isEqualTo("PROD")
        assertThat(diagnostics.page).isEqualTo("unbekannt")
        assertThat(diagnostics.userAgent).isEqualTo("unbekannt")
        assertThat(diagnostics.recentErrors).isEmpty()
    }

    @Test
    fun `records the reporter as unknown when there is no authentication`() {
        SecurityContextHolder.clearContext()
        val service = SupportService(propertiesWithRecipients("support@localhost"), mailSenderService, clock)

        service.sendSupportRequest(SupportRequest(title = "Something is broken", text = "more details"))

        val contextSlot = slot<Context>()
        verify { mailSenderService.sendHtmlMailTo(any(), any(), any(), any(), capture(contextSlot)) }

        assertThat((contextSlot.captured.getVariable("diagnostics") as SupportDiagnostics).username)
            .isEqualTo("unbekannt")
    }

    @Test
    fun `fails clearly when no recipient is configured`() {
        val properties = TafelAdminProperties().apply { support = TafelAdminSupportProperties() }
        val service = SupportService(properties, mailSenderService, clock)

        assertThatThrownBy { service.sendSupportRequest(SupportRequest(title = "title", text = "text")) }
            .isInstanceOf(TafelApiException::class.java)
            .satisfies({ ex ->
                assertThat((ex as TafelApiException).statusCode).isEqualTo(HttpStatus.INTERNAL_SERVER_ERROR)
            })

        verify(exactly = 0) { mailSenderService.sendHtmlMailTo(any(), any(), any(), any(), any()) }
    }

    @Test
    fun `fails clearly when only blank recipients are configured`() {
        val service = SupportService(propertiesWithRecipients(" "), mailSenderService, clock)

        assertThatThrownBy { service.sendSupportRequest(SupportRequest(title = "title", text = "text")) }
            .isInstanceOf(TafelApiException::class.java)

        verify(exactly = 0) { mailSenderService.sendHtmlMailTo(any(), any(), any(), any(), any()) }
    }

    @Test
    fun `fails clearly when support is not configured at all`() {
        val service = SupportService(TafelAdminProperties(), mailSenderService, clock)

        assertThatThrownBy { service.sendSupportRequest(SupportRequest(title = "title", text = "text")) }
            .isInstanceOf(TafelApiException::class.java)
            .satisfies({ ex ->
                assertThat((ex as TafelApiException).statusCode).isEqualTo(HttpStatus.INTERNAL_SERVER_ERROR)
            })

        verify(exactly = 0) { mailSenderService.sendHtmlMailTo(any(), any(), any(), any(), any()) }
    }

    private fun propertiesWithRecipients(vararg recipients: String) = TafelAdminProperties().apply {
        support = TafelAdminSupportProperties().apply { this.recipients = recipients.toList() }
    }
}
