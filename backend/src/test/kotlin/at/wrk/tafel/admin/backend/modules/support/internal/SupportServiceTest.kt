package at.wrk.tafel.admin.backend.modules.support.internal

import at.wrk.tafel.admin.backend.common.mail.MailAttachment
import at.wrk.tafel.admin.backend.common.mail.MailSenderService
import at.wrk.tafel.admin.backend.config.properties.TafelAdminProperties
import at.wrk.tafel.admin.backend.config.properties.TafelAdminSupportProperties
import at.wrk.tafel.admin.backend.database.model.auth.UserEntity
import at.wrk.tafel.admin.backend.database.model.auth.UserRepository
import at.wrk.tafel.admin.backend.database.model.base.EmployeeEntity
import at.wrk.tafel.admin.backend.modules.base.exception.TafelApiException
import at.wrk.tafel.admin.backend.modules.support.model.SupportClientContext
import at.wrk.tafel.admin.backend.modules.support.model.SupportClientLogItem
import at.wrk.tafel.admin.backend.modules.support.model.SupportRequest
import io.mockk.every
import io.mockk.impl.annotations.MockK
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
import org.springframework.http.MediaType
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken
import org.springframework.security.core.context.SecurityContextHolder
import org.thymeleaf.context.Context
import java.time.Clock
import java.time.Instant
import java.time.ZoneId
import java.util.Base64

@ExtendWith(MockKExtension::class)
class SupportServiceTest {

    @RelaxedMockK
    private lateinit var mailSenderService: MailSenderService

    @MockK
    private lateinit var userRepository: UserRepository

    private val clock = Clock.fixed(Instant.parse("2026-03-22T09:15:30Z"), ZoneId.of("Europe/Vienna"))

    @BeforeEach
    fun beforeEach() {
        SecurityContextHolder.getContext().authentication =
            UsernamePasswordAuthenticationToken("test-user", null, emptyList())
        every { userRepository.findByUsername("test-user") } returns UserEntity(
            username = "test-user",
            password = "pwd",
            employee = EmployeeEntity(personnelNumber = "1234", firstname = "Max", lastname = "Mustermann"),
        )
    }

    @AfterEach
    fun afterEach() {
        SecurityContextHolder.clearContext()
    }

    @Test
    fun `sends the request to the configured recipients`() {
        val service = SupportService(
            propertiesWithRecipients("support1@localhost", "support2@localhost", subjectPrefix = "Support:"),
            mailSenderService,
            userRepository,
            clock,
        )

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
        assertThat(subjectSlot.captured).isEqualTo("Support: Something is broken")
        assertThat(contextSlot.captured.getVariable("supportTitle")).isEqualTo("Something is broken")
        assertThat(contextSlot.captured.getVariable("supportText")).isEqualTo("more details")
    }

    @Test
    fun `puts the configured prefix in front of the reported title`() {
        val service = SupportService(propertiesWithRecipients("support@localhost", subjectPrefix = "Support:"), mailSenderService, userRepository, clock)

        service.sendSupportRequest(SupportRequest(title = "Something is broken", text = "more details"))

        val subjectSlot = slot<String>()
        verify { mailSenderService.sendHtmlMailTo(any(), capture(subjectSlot), any(), any(), any()) }

        assertThat(subjectSlot.captured).isEqualTo("Support: Something is broken")
    }

    @Test
    fun `subjects the mail with the bare title when no prefix is configured`() {
        val service = SupportService(propertiesWithRecipients("support@localhost", subjectPrefix = " "), mailSenderService, userRepository, clock)

        service.sendSupportRequest(SupportRequest(title = "Something is broken", text = "more details"))

        val subjectSlot = slot<String>()
        verify { mailSenderService.sendHtmlMailTo(any(), capture(subjectSlot), any(), any(), any()) }

        assertThat(subjectSlot.captured).isEqualTo("Something is broken")
    }

    @Test
    fun `collects reporter, build and browser context as diagnostics`() {
        val properties = propertiesWithRecipients("support@localhost").apply {
            version = "1.2.3"
            buildTime = "2026-03-20T10:00:00Z"
            environmentLabel = "TEST"
        }
        val service = SupportService(properties, mailSenderService, userRepository, clock)

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
                screenshotAttached = false,
                reportedBy = "test-user (Max Mustermann)",
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
        val service = SupportService(propertiesWithRecipients("support@localhost"), mailSenderService, userRepository, clock)

        service.sendSupportRequest(SupportRequest(title = "Something is broken", text = "more details"))

        val contextSlot = slot<Context>()
        verify { mailSenderService.sendHtmlMailTo(any(), any(), any(), any(), capture(contextSlot)) }

        val diagnostics = contextSlot.captured.getVariable("diagnostics") as SupportDiagnostics
        assertThat(diagnostics.reportedBy).isEqualTo("test-user (Max Mustermann)")
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
        val service = SupportService(propertiesWithRecipients("support@localhost"), mailSenderService, userRepository, clock)

        service.sendSupportRequest(SupportRequest(title = "Something is broken", text = "more details"))

        val contextSlot = slot<Context>()
        verify { mailSenderService.sendHtmlMailTo(any(), any(), any(), any(), capture(contextSlot)) }

        assertThat((contextSlot.captured.getVariable("diagnostics") as SupportDiagnostics).reportedBy)
            .isEqualTo("unbekannt")
    }

    @Test
    fun `records the reporter by username alone when there is no user behind it to name`() {
        every { userRepository.findByUsername("test-user") } returns null
        val service = SupportService(propertiesWithRecipients("support@localhost"), mailSenderService, userRepository, clock)

        service.sendSupportRequest(SupportRequest(title = "Something is broken", text = "more details"))

        val contextSlot = slot<Context>()
        verify { mailSenderService.sendHtmlMailTo(any(), any(), any(), any(), capture(contextSlot)) }

        assertThat((contextSlot.captured.getVariable("diagnostics") as SupportDiagnostics).reportedBy)
            .isEqualTo("test-user")
    }

    @Test
    fun `attaches the screenshot the browser sent`() {
        val service = SupportService(propertiesWithRecipients("support@localhost"), mailSenderService, userRepository, clock)
        val imageBytes = byteArrayOf(1, 2, 3, 4)

        service.sendSupportRequest(
            SupportRequest(
                title = "Something is broken",
                text = "more details",
                clientContext = SupportClientContext(
                    screenshot = "data:image/jpeg;base64,${Base64.getEncoder().encodeToString(imageBytes)}",
                ),
            ),
        )

        val attachmentsSlot = slot<List<MailAttachment>>()
        val contextSlot = slot<Context>()
        verify { mailSenderService.sendHtmlMailTo(any(), any(), capture(attachmentsSlot), any(), capture(contextSlot)) }

        val attachment = attachmentsSlot.captured.single()
        assertThat(attachment.filename).isEqualTo("screenshot.jpg")
        assertThat(attachment.contentType).isEqualTo(MediaType.IMAGE_JPEG_VALUE)
        assertThat(attachment.inputStreamSource.inputStream.readBytes()).isEqualTo(imageBytes)
        assertThat((contextSlot.captured.getVariable("diagnostics") as SupportDiagnostics).screenshotAttached).isTrue()
    }

    @Test
    fun `sends the request without an attachment when no screenshot was sent`() {
        val service = SupportService(propertiesWithRecipients("support@localhost"), mailSenderService, userRepository, clock)

        service.sendSupportRequest(SupportRequest(title = "title", text = "text"))

        verify { mailSenderService.sendHtmlMailTo(any(), any(), emptyList(), any(), any()) }
    }

    @Test
    fun `still sends the request when the screenshot cannot be used`() {
        val service = SupportService(propertiesWithRecipients("support@localhost"), mailSenderService, userRepository, clock)

        // a data URL of a type this doesn't handle, and one whose base64 is broken
        listOf("data:image/png;base64,AAAA", "data:image/jpeg;base64,not-base64!!").forEach { screenshot ->
            service.sendSupportRequest(
                SupportRequest(
                    title = "title",
                    text = "text",
                    clientContext = SupportClientContext(screenshot = screenshot),
                ),
            )
        }

        val contextSlot = mutableListOf<Context>()
        verify(exactly = 2) {
            mailSenderService.sendHtmlMailTo(any(), any(), emptyList(), any(), capture(contextSlot))
        }
        assertThat(contextSlot).allSatisfy { context ->
            assertThat((context.getVariable("diagnostics") as SupportDiagnostics).screenshotAttached).isFalse()
        }
    }

    @Test
    fun `fails clearly when no recipient is configured`() {
        val properties = TafelAdminProperties().apply { support = TafelAdminSupportProperties() }
        val service = SupportService(properties, mailSenderService, userRepository, clock)

        assertThatThrownBy { service.sendSupportRequest(SupportRequest(title = "title", text = "text")) }
            .isInstanceOf(TafelApiException::class.java)
            .satisfies({ ex ->
                assertThat((ex as TafelApiException).statusCode).isEqualTo(HttpStatus.INTERNAL_SERVER_ERROR)
            })

        verify(exactly = 0) { mailSenderService.sendHtmlMailTo(any(), any(), any(), any(), any()) }
    }

    @Test
    fun `fails clearly when only blank recipients are configured`() {
        val service = SupportService(propertiesWithRecipients(" "), mailSenderService, userRepository, clock)

        assertThatThrownBy { service.sendSupportRequest(SupportRequest(title = "title", text = "text")) }
            .isInstanceOf(TafelApiException::class.java)

        verify(exactly = 0) { mailSenderService.sendHtmlMailTo(any(), any(), any(), any(), any()) }
    }

    @Test
    fun `fails clearly when support is not configured at all`() {
        val service = SupportService(TafelAdminProperties(), mailSenderService, userRepository, clock)

        assertThatThrownBy { service.sendSupportRequest(SupportRequest(title = "title", text = "text")) }
            .isInstanceOf(TafelApiException::class.java)
            .satisfies({ ex ->
                assertThat((ex as TafelApiException).statusCode).isEqualTo(HttpStatus.INTERNAL_SERVER_ERROR)
            })

        verify(exactly = 0) { mailSenderService.sendHtmlMailTo(any(), any(), any(), any(), any()) }
    }

    private fun propertiesWithRecipients(vararg recipients: String, subjectPrefix: String = "") = TafelAdminProperties().apply {
        support = TafelAdminSupportProperties().apply {
            this.recipients = recipients.toList()
            this.subjectPrefix = subjectPrefix
        }
    }
}
