package at.wrk.tafel.admin.backend.common.mail

import at.wrk.tafel.admin.backend.modules.reporting.internal.ReturnBoxesDataModel
import at.wrk.tafel.admin.backend.modules.reporting.internal.ReturnBoxesRoute
import at.wrk.tafel.admin.backend.modules.reporting.internal.ReturnBoxesShop
import at.wrk.tafel.admin.backend.modules.support.internal.SupportDiagnostics
import at.wrk.tafel.admin.backend.modules.support.internal.SupportDiagnosticsError
import org.assertj.core.api.Assertions.assertThat
import org.junit.jupiter.api.Test
import org.thymeleaf.context.Context
import org.thymeleaf.spring6.SpringTemplateEngine
import org.thymeleaf.templatemode.TemplateMode
import org.thymeleaf.templateresolver.ClassLoaderTemplateResolver

// Renders the real templates from src/main/resources/mail-templates (mirroring the
// spring.thymeleaf.prefix config in application.yml) instead of mocking the TemplateEngine like
// MailSenderServiceTest does, and compares the full output byte-for-byte against golden reference
// files, so template syntax errors and layout/whitespace regressions actually surface here.
class MailTemplateRenderingTest {

    private val templateEngine = SpringTemplateEngine().apply {
        setTemplateResolver(
            ClassLoaderTemplateResolver().apply {
                prefix = "mail-templates/"
                suffix = ".html"
                templateMode = TemplateMode.HTML
                characterEncoding = "UTF-8"
            },
        )
    }

    private fun render(subTemplate: String, context: Context): String {
        context.setVariable("subTemplate", subTemplate)
        return templateEngine.process("mail-layout", context)
    }

    private fun loadReference(filename: String): String = javaClass.getResourceAsStream("/mail-references/$filename")!!
        .bufferedReader(Charsets.UTF_8)
        .readText()

    @Test
    fun `daily-report-mail renders distribution date and notes`() {
        val context = Context()
        context.setVariable("distributionDate", "22.03.2026")
        context.setVariable("notes", "some notes")

        val rendered = render("mails/daily-report-mail", context)

        assertThat(rendered).isEqualTo(loadReference("daily-report-mail-with-notes.html"))
    }

    @Test
    fun `daily-report-mail renders placeholder when there are no notes`() {
        val context = Context()
        context.setVariable("distributionDate", "22.03.2026")

        val rendered = render("mails/daily-report-mail", context)

        assertThat(rendered).isEqualTo(loadReference("daily-report-mail-without-notes.html"))
    }

    @Test
    fun `daily-report-mail escapes markup typed into the distribution notes`() {
        val context = Context()
        context.setVariable("distributionDate", "22.03.2026")
        context.setVariable("notes", "<script>alert(1)</script>")

        val rendered = render("mails/daily-report-mail", context)

        assertThat(rendered).contains("""<div class="tafel-note">&lt;script&gt;alert(1)&lt;/script&gt;</div>""")
    }

    // Not compared against a reference file on purpose: the newline is part of the *data* here, and
    // a golden file would have it rewritten by git's line-ending normalization on checkout.
    @Test
    fun `daily-report-mail keeps the line breaks typed into the distribution notes`() {
        val context = Context()
        context.setVariable("distributionDate", "22.03.2026")
        context.setVariable("notes", "Erste Zeile\nZweite Zeile")

        val rendered = render("mails/daily-report-mail", context)

        assertThat(rendered).contains("<div class=\"tafel-note\">Erste Zeile\nZweite Zeile</div>")
    }

    @Test
    fun `statistic-mail renders distribution date`() {
        val context = Context()
        context.setVariable("distributionDate", "22.03.2026")

        val rendered = render("mails/statistic-mail", context)

        assertThat(rendered).isEqualTo(loadReference("statistic-mail.html"))
    }

    @Test
    fun `return-boxes-mail renders distribution date, notes, routes and shops`() {
        val context = Context()
        context.setVariable("distributionDate", "22.03.2026")
        context.setVariable("notes", "some notes")
        context.setVariable(
            "returnBoxes",
            ReturnBoxesDataModel(
                routes = listOf(
                    ReturnBoxesRoute(
                        name = "Route 1",
                        shops = listOf(
                            ReturnBoxesShop(
                                name = "Shop 1",
                                address = "Street 1, 1234, City",
                                returnBoxes = "4x Category 2",
                            ),
                        ),
                    ),
                ),
            ),
        )

        val rendered = render("mails/return-boxes-mail", context)

        assertThat(rendered).isEqualTo(loadReference("return-boxes-mail-with-data.html"))
    }

    @Test
    fun `return-boxes-mail escapes markup typed into notes, route names, shop data and return-box descriptions`() {
        val context = Context()
        context.setVariable("distributionDate", "22.03.2026")
        context.setVariable("notes", "<script>alert('notes')</script>")
        context.setVariable(
            "returnBoxes",
            ReturnBoxesDataModel(
                routes = listOf(
                    ReturnBoxesRoute(
                        name = "<script>alert('route')</script>",
                        shops = listOf(
                            ReturnBoxesShop(
                                name = "<script>alert('shop')</script>",
                                address = "<script>alert('address')</script>",
                                returnBoxes = "<script>alert('returnBoxes')</script>",
                            ),
                        ),
                    ),
                ),
            ),
        )

        val rendered = render("mails/return-boxes-mail", context)

        assertThat(rendered).doesNotContain("<script>")
        assertThat(rendered).contains("""<div class="tafel-note">&lt;script&gt;alert(&#39;notes&#39;)&lt;/script&gt;</div>""")
        assertThat(rendered).contains("""<div style="font-weight: bold; margin-bottom: 6px;">&lt;script&gt;alert(&#39;route&#39;)&lt;/script&gt;</div>""")
        assertThat(rendered).contains("""<strong>&lt;script&gt;alert(&#39;shop&#39;)&lt;/script&gt;</strong>""")
        assertThat(rendered).contains("""<span style="color: #6B6B6B;">&lt;script&gt;alert(&#39;address&#39;)&lt;/script&gt;</span>""")
        assertThat(rendered).contains("""<td>&lt;script&gt;alert(&#39;returnBoxes&#39;)&lt;/script&gt;</td>""")
    }

    @Test
    fun `support-request-mail renders the request, diagnostics and browser errors`() {
        val context = Context()
        context.setVariable("supportTitle", "Login geht nicht")
        context.setVariable("supportText", "Der Login bricht ab")
        context.setVariable(
            "diagnostics",
            supportDiagnostics(
                recentErrors = listOf(
                    SupportDiagnosticsError(timestamp = "10:15:00", message = "HTTP 500 - GET /api/households"),
                ),
            ),
        )

        val rendered = render("mails/support-request-mail", context)

        assertThat(rendered).isEqualTo(loadReference("support-request-mail-with-errors.html"))
    }

    // Not compared against a reference file on purpose: the newline is part of the *data* here, and
    // a golden file would have it rewritten by git's line-ending normalization on checkout.
    @Test
    fun `support-request-mail keeps the line breaks the reporter typed`() {
        val context = Context()
        context.setVariable("supportTitle", "Login geht nicht")
        context.setVariable("supportText", "Erste Zeile\nZweite Zeile")
        context.setVariable("diagnostics", supportDiagnostics())

        val rendered = render("mails/support-request-mail", context)

        assertThat(rendered).contains("<p style=\"white-space: pre-wrap; margin-top: 12px;\">Erste Zeile\nZweite Zeile</p>")
    }

    @Test
    fun `support-request-mail escapes what the reporter typed and renders a placeholder without errors`() {
        val context = Context()
        context.setVariable("supportTitle", "<b>kaputt</b>")
        context.setVariable("supportText", "<script>alert(1)</script>")
        context.setVariable(
            "diagnostics",
            supportDiagnostics(
                screenshotAttached = false,
                environmentLabel = "PROD",
                page = "unbekannt",
                userAgent = "unbekannt",
                viewport = "unbekannt",
                screen = "unbekannt",
                language = "unbekannt",
                timeZone = "unbekannt",
            ),
        )

        val rendered = render("mails/support-request-mail", context)

        assertThat(rendered).isEqualTo(loadReference("support-request-mail-without-errors.html"))
    }

    private fun supportDiagnostics(
        screenshotAttached: Boolean = true,
        environmentLabel: String = "TEST",
        page: String = "http://localhost/kunden/suchen",
        userAgent: String = "Mozilla/5.0",
        viewport: String = "1280x800",
        screen: String = "1920x1080",
        language: String = "de-AT",
        timeZone: String = "Europe/Vienna",
        recentErrors: List<SupportDiagnosticsError> = emptyList(),
    ) = SupportDiagnostics(
        screenshotAttached = screenshotAttached,
        reportedBy = "test-user (Max Mustermann)",
        reportedAt = "22.03.2026 10:15:30",
        version = "1.2.3",
        buildTime = "2026-03-20T10:00:00Z",
        environmentLabel = environmentLabel,
        page = page,
        userAgent = userAgent,
        viewport = viewport,
        screen = screen,
        language = language,
        timeZone = timeZone,
        recentErrors = recentErrors,
    )

    @Test
    fun `return-boxes-mail renders placeholder when there are no routes`() {
        val context = Context()
        context.setVariable("distributionDate", "22.03.2026")
        context.setVariable("notes", "some notes")
        context.setVariable("returnBoxes", ReturnBoxesDataModel(routes = emptyList()))

        val rendered = render("mails/return-boxes-mail", context)

        assertThat(rendered).isEqualTo(loadReference("return-boxes-mail-without-routes.html"))
    }
}
