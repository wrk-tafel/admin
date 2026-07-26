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
// MailSenderServiceTest does, so template syntax errors and model/variable mismatches actually
// surface here instead of only at runtime.
class MailTemplateRenderingTest {

    private val templateEngine = SpringTemplateEngine().apply {
        setTemplateResolver(
            ClassLoaderTemplateResolver().apply {
                prefix = "mail-templates/"
                suffix = ".html"
                templateMode = TemplateMode.HTML
                characterEncoding = "UTF-8"
            }
        )
    }

    private fun render(subTemplate: String, context: Context): String {
        context.setVariable("subTemplate", subTemplate)
        return templateEngine.process("mail-layout", context)
    }

    @Test
    fun `mail-layout wraps the sub-template with greeting, signature and logo`() {
        val context = Context()
        context.setVariable("distributionDate", "22.03.2026")

        val rendered = render("mails/statistic-mail", context)

        assertThat(rendered).contains("Liebe Kolleginnen und Kollegen")
        assertThat(rendered).contains("Liebe Grüße")
        assertThat(rendered).contains("TÖ Tafel 1030")
        assertThat(rendered).contains("cid:logo")
    }

    @Test
    fun `daily-report-mail renders distribution date and notes`() {
        val context = Context()
        context.setVariable("distributionDate", "22.03.2026")
        context.setVariable("notes", "some notes")

        val rendered = render("mails/daily-report-mail", context)

        assertThat(rendered).contains("Der Tagesreport zur Ausgabe vom 22.03.2026")
        assertThat(rendered).contains("some notes")
        assertThat(rendered).doesNotContain("Keine")
    }

    @Test
    fun `daily-report-mail renders placeholder when there are no notes`() {
        val context = Context()
        context.setVariable("distributionDate", "22.03.2026")

        val rendered = render("mails/daily-report-mail", context)

        assertThat(rendered).contains("Keine")
    }

    @Test
    fun `statistic-mail renders distribution date`() {
        val context = Context()
        context.setVariable("distributionDate", "22.03.2026")

        val rendered = render("mails/statistic-mail", context)

        assertThat(rendered).contains("Die Statistiken zur Ausgabe vom 22.03.2026")
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
                                returnBoxes = "4x Category 2"
                            )
                        )
                    )
                )
            )
        )

        val rendered = render("mails/return-boxes-mail", context)

        assertThat(rendered).contains("Infos zur Ausgabe vom 22.03.2026")
        assertThat(rendered).contains("some notes")
        assertThat(rendered).contains("Route 1")
        assertThat(rendered).contains("Shop 1")
        assertThat(rendered).contains("Street 1, 1234, City")
        assertThat(rendered).contains("4x Category 2")
    }

    @Test
    fun `return-boxes-mail renders placeholder when there are no routes`() {
        val context = Context()
        context.setVariable("distributionDate", "22.03.2026")
        context.setVariable("notes", "some notes")
        context.setVariable("returnBoxes", ReturnBoxesDataModel(routes = emptyList()))

        val rendered = render("mails/return-boxes-mail", context)

        assertThat(rendered).contains("Retourkisten")
        assertThat(rendered).contains("Keine")
    }

}
