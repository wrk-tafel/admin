package at.wrk.tafel.admin.backend.config

import at.wrk.tafel.admin.backend.config.properties.TafelAdminProperties
import io.mockk.every
import io.mockk.mockk
import jakarta.servlet.http.HttpServletRequest
import org.assertj.core.api.Assertions.assertThat
import org.junit.jupiter.api.Test
import org.springframework.core.io.ByteArrayResource
import org.springframework.core.io.Resource
import org.springframework.core.io.ResourceLoader
import org.springframework.http.HttpStatus

class IndexHtmlControllerTest {

    private val resourceLoader = mockk<ResourceLoader>()

    @Test
    fun `base href rewritten to the configured relative base url`() {
        every { resourceLoader.getResource(match { it.endsWith("/static/index.html") }) } returns indexHtmlResource(
            "<html><head><base href=\"/\"></head><body></body></html>",
        )
        val controller = IndexHtmlController(
            tafelAdminProperties = TafelAdminProperties().apply { server.relativeBaseUrl = "/verwaltung-dev/" },
            resourceLoader = resourceLoader,
        )

        val response = controller.index()

        assertThat(response.statusCode).isEqualTo(HttpStatus.OK)
        assertThat(response.body).isEqualTo("<html><head><base href=\"/verwaltung-dev/\"></head><body></body></html>")
    }

    @Test
    fun `trailing slash added when the configured relative base url is missing one`() {
        every { resourceLoader.getResource(match { it.endsWith("/static/index.html") }) } returns indexHtmlResource(
            "<html><head><base href=\"/\"></head><body></body></html>",
        )
        val controller = IndexHtmlController(
            tafelAdminProperties = TafelAdminProperties().apply { server.relativeBaseUrl = "/verwaltung-dev" },
            resourceLoader = resourceLoader,
        )

        val response = controller.index()

        assertThat(response.body).isEqualTo("<html><head><base href=\"/verwaltung-dev/\"></head><body></body></html>")
    }

    @Test
    fun `base href left as root when no relative base url is configured`() {
        every { resourceLoader.getResource(match { it.endsWith("/static/index.html") }) } returns indexHtmlResource(
            "<html><head><base href=\"/\"></head><body></body></html>",
        )
        val controller = IndexHtmlController(
            tafelAdminProperties = TafelAdminProperties(),
            resourceLoader = resourceLoader,
        )

        val response = controller.index()

        assertThat(response.body).isEqualTo("<html><head><base href=\"/\"></head><body></body></html>")
    }

    @Test
    fun `title gets the full branding and apple-mobile-web-app-title the short one`() {
        every { resourceLoader.getResource(match { it.endsWith("/static/index.html") }) } returns indexHtmlResource(
            "<html><head><base href=\"/\"><title>Tafel Admin</title>" +
                "<meta name=\"apple-mobile-web-app-title\" content=\"Tafel Admin\"></head><body></body></html>",
        )
        val controller = IndexHtmlController(
            tafelAdminProperties = TafelAdminProperties().apply { environmentLabel = "DEV" },
            resourceLoader = resourceLoader,
        )

        val response = controller.index()

        assertThat(response.body).isEqualTo(
            "<html><head><base href=\"/\"><title>Tafel Admin (DEV)</title>" +
                "<meta name=\"apple-mobile-web-app-title\" content=\"Tafel DEV\"></head><body></body></html>",
        )
    }

    @Test
    fun `title left unchanged when no environment label is configured`() {
        every { resourceLoader.getResource(match { it.endsWith("/static/index.html") }) } returns indexHtmlResource(
            "<html><head><base href=\"/\"><title>Tafel Admin</title></head><body></body></html>",
        )
        val controller = IndexHtmlController(
            tafelAdminProperties = TafelAdminProperties(),
            resourceLoader = resourceLoader,
        )

        val response = controller.index()

        assertThat(response.body).isEqualTo(
            "<html><head><base href=\"/\"><title>Tafel Admin</title></head><body></body></html>",
        )
    }

    @Test
    fun `loading screen environment label is filled with the configured environment label`() {
        every { resourceLoader.getResource(match { it.endsWith("/static/index.html") }) } returns indexHtmlResource(
            "<html><head><base href=\"/\"></head><body>" +
                "<div class=\"tafel-app-loading-environment-label\"></div></body></html>",
        )
        val controller = IndexHtmlController(
            tafelAdminProperties = TafelAdminProperties().apply { environmentLabel = "DEV" },
            resourceLoader = resourceLoader,
        )

        val response = controller.index()

        assertThat(response.body).isEqualTo(
            "<html><head><base href=\"/\"></head><body>" +
                "<div class=\"tafel-app-loading-environment-label\">DEV</div></body></html>",
        )
    }

    @Test
    fun `loading screen environment label left empty when no environment label is configured`() {
        every { resourceLoader.getResource(match { it.endsWith("/static/index.html") }) } returns indexHtmlResource(
            "<html><head><base href=\"/\"></head><body>" +
                "<div class=\"tafel-app-loading-environment-label\"></div></body></html>",
        )
        val controller = IndexHtmlController(
            tafelAdminProperties = TafelAdminProperties(),
            resourceLoader = resourceLoader,
        )

        val response = controller.index()

        assertThat(response.body).isEqualTo(
            "<html><head><base href=\"/\"></head><body>" +
                "<div class=\"tafel-app-loading-environment-label\"></div></body></html>",
        )
    }

    @Test
    fun `missing index html results in a 404`() {
        every { resourceLoader.getResource(match { it.endsWith("/static/index.html") }) } returns mockk<Resource> {
            every { exists() } returns false
        }
        val controller = IndexHtmlController(
            tafelAdminProperties = TafelAdminProperties(),
            resourceLoader = resourceLoader,
        )

        val response = controller.index()

        assertThat(response.statusCode).isEqualTo(HttpStatus.NOT_FOUND)
    }

    @Test
    fun `spa fallback serves the app shell for a client-side route`() {
        every { resourceLoader.getResource(match { it.endsWith("/static/index.html") }) } returns indexHtmlResource(
            "<html><head><base href=\"/\"></head><body></body></html>",
        )
        val controller = IndexHtmlController(
            tafelAdminProperties = TafelAdminProperties(),
            resourceLoader = resourceLoader,
        )
        val request = mockk<HttpServletRequest> {
            every { requestURI } returns "/login"
        }

        val response = controller.spaFallback(path = "login", request = request)

        assertThat(response.statusCode).isEqualTo(HttpStatus.OK)
        assertThat(response.body).isEqualTo("<html><head><base href=\"/\"></head><body></body></html>")
    }

    @Test
    fun `spa fallback does not swallow unmatched api requests into a 200`() {
        val controller = IndexHtmlController(
            tafelAdminProperties = TafelAdminProperties(),
            resourceLoader = resourceLoader,
        )
        val request = mockk<HttpServletRequest> {
            every { requestURI } returns "/api/some-nonexistent-endpoint"
        }

        val response = controller.spaFallback(path = "some-nonexistent-endpoint", request = request)

        assertThat(response.statusCode).isEqualTo(HttpStatus.NOT_FOUND)
    }

    @Test
    fun `manifest name gets the full branding and short_name the home-screen-sized one`() {
        every { resourceLoader.getResource(match { it.endsWith("/static/manifest.webmanifest") }) } returns indexHtmlResource(
            "{\n  \"name\": \"Tafel Admin\",\n  \"short_name\": \"Tafel Admin\",\n  \"description\": \"Tafel Admin\"\n}",
        )
        val controller = IndexHtmlController(
            tafelAdminProperties = TafelAdminProperties().apply { environmentLabel = "TEST" },
            resourceLoader = resourceLoader,
        )

        val response = controller.manifest()

        assertThat(response.statusCode).isEqualTo(HttpStatus.OK)
        assertThat(response.body).isEqualTo(
            "{\n  \"name\": \"Tafel Admin (TEST)\",\n  \"short_name\": \"Tafel TEST\",\n  \"description\": \"Tafel Admin\"\n}",
        )
    }

    /**
     * The whole point of the short form is that a home-screen label truncates at around twelve
     * characters, so the labels actually in use have to be checked against that budget rather than
     * just against "is it shorter than the long form".
     */
    @Test
    fun `short_name stays within a home-screen label's budget for every environment`() {
        listOf("" to "Tafel Admin", "DEV" to "Tafel DEV", "TEST" to "Tafel TEST", "LOCAL" to "Tafel LOCAL")
            .forEach { (label, expected) ->
                every {
                    resourceLoader.getResource(match { it.endsWith("/static/manifest.webmanifest") })
                } returns indexHtmlResource("{\n  \"name\": \"Tafel Admin\",\n  \"short_name\": \"Tafel Admin\"\n}")
                val controller = IndexHtmlController(
                    tafelAdminProperties = TafelAdminProperties().apply { environmentLabel = label },
                    resourceLoader = resourceLoader,
                )

                val response = controller.manifest()

                assertThat(response.body).contains("\"short_name\": \"$expected\"")
                assertThat(expected.length).isLessThanOrEqualTo(12)
            }
    }

    @Test
    fun `manifest left unchanged when no environment label is configured`() {
        every { resourceLoader.getResource(match { it.endsWith("/static/manifest.webmanifest") }) } returns indexHtmlResource(
            "{\n  \"name\": \"Tafel Admin\",\n  \"short_name\": \"Tafel Admin\"\n}",
        )
        val controller = IndexHtmlController(
            tafelAdminProperties = TafelAdminProperties(),
            resourceLoader = resourceLoader,
        )

        val response = controller.manifest()

        assertThat(response.body).isEqualTo("{\n  \"name\": \"Tafel Admin\",\n  \"short_name\": \"Tafel Admin\"\n}")
    }

    @Test
    fun `missing manifest results in a 404`() {
        every { resourceLoader.getResource(match { it.endsWith("/static/manifest.webmanifest") }) } returns mockk<Resource> {
            every { exists() } returns false
        }
        val controller = IndexHtmlController(
            tafelAdminProperties = TafelAdminProperties(),
            resourceLoader = resourceLoader,
        )

        val response = controller.manifest()

        assertThat(response.statusCode).isEqualTo(HttpStatus.NOT_FOUND)
    }

    private fun indexHtmlResource(content: String): Resource = ByteArrayResource(content.toByteArray())
}
