package at.wrk.tafel.admin.backend.config

import at.wrk.tafel.admin.backend.config.properties.TafelAdminProperties
import at.wrk.tafel.admin.backend.config.properties.TafelAdminServerProperties
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
            tafelAdminProperties = TafelAdminProperties(server = TafelAdminServerProperties(relativeBaseUrl = "/verwaltung-dev/")),
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
            tafelAdminProperties = TafelAdminProperties(server = TafelAdminServerProperties(relativeBaseUrl = "/verwaltung-dev")),
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
    fun `title and apple-mobile-web-app-title are branded with the configured environment label`() {
        every { resourceLoader.getResource(match { it.endsWith("/static/index.html") }) } returns indexHtmlResource(
            "<html><head><base href=\"/\"><title>Tafel Admin</title>" +
                "<meta name=\"apple-mobile-web-app-title\" content=\"Tafel Admin\"></head><body></body></html>",
        )
        val controller = IndexHtmlController(
            tafelAdminProperties = TafelAdminProperties(environmentLabel = "DEV"),
            resourceLoader = resourceLoader,
        )

        val response = controller.index()

        assertThat(response.body).isEqualTo(
            "<html><head><base href=\"/\"><title>Tafel Admin (DEV)</title>" +
                "<meta name=\"apple-mobile-web-app-title\" content=\"Tafel Admin (DEV)\"></head><body></body></html>",
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
    fun `manifest name and short_name are branded with the configured environment label`() {
        every { resourceLoader.getResource(match { it.endsWith("/static/manifest.webmanifest") }) } returns indexHtmlResource(
            "{\n  \"name\": \"Tafel Admin\",\n  \"short_name\": \"Tafel Admin\",\n  \"description\": \"Tafel Admin\"\n}",
        )
        val controller = IndexHtmlController(
            tafelAdminProperties = TafelAdminProperties(environmentLabel = "TEST"),
            resourceLoader = resourceLoader,
        )

        val response = controller.manifest()

        assertThat(response.statusCode).isEqualTo(HttpStatus.OK)
        assertThat(response.body).isEqualTo(
            "{\n  \"name\": \"Tafel Admin (TEST)\",\n  \"short_name\": \"Tafel Admin (TEST)\",\n  \"description\": \"Tafel Admin\"\n}",
        )
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
