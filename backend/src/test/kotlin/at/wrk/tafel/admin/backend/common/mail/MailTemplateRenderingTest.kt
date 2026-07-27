package at.wrk.tafel.admin.backend.common.mail

import at.wrk.tafel.admin.backend.modules.distribution.internal.postprocessors.ReturnBoxesDataModel
import at.wrk.tafel.admin.backend.modules.distribution.internal.postprocessors.ReturnBoxesRoute
import at.wrk.tafel.admin.backend.modules.distribution.internal.postprocessors.ReturnBoxesShop
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
    fun `return-boxes-mail renders placeholder when there are no routes`() {
        val context = Context()
        context.setVariable("distributionDate", "22.03.2026")
        context.setVariable("notes", "some notes")
        context.setVariable("returnBoxes", ReturnBoxesDataModel(routes = emptyList()))

        val rendered = render("mails/return-boxes-mail", context)

        assertThat(rendered).isEqualTo(loadReference("return-boxes-mail-without-routes.html"))
    }
}
