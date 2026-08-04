package at.wrk.tafel.admin.backend.config

import at.wrk.tafel.admin.backend.config.properties.TafelAdminProperties
import at.wrk.tafel.admin.backend.config.properties.TafelAdminServerProperties
import io.mockk.every
import io.mockk.mockk
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

    private fun indexHtmlResource(content: String): Resource = ByteArrayResource(content.toByteArray())

}
