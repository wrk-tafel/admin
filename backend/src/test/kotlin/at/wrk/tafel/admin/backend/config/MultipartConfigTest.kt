package at.wrk.tafel.admin.backend.config

import at.wrk.tafel.admin.backend.config.properties.TafelAdminProperties
import jakarta.servlet.MultipartConfigElement
import org.assertj.core.api.Assertions.assertThat
import org.junit.jupiter.api.Test
import org.springframework.boot.autoconfigure.AutoConfigurations
import org.springframework.boot.servlet.autoconfigure.MultipartAutoConfiguration
import org.springframework.boot.test.context.runner.WebApplicationContextRunner
import org.springframework.util.unit.DataSize

/**
 * The document limit is one configured value; what the servlet container is given has to follow it,
 * or the two drift apart again - which is the failure this replaced: a ceiling below the business
 * limit turns an oversized upload into a `MaxUploadSizeExceededException` instead of the message
 * naming the limit.
 */
internal class MultipartConfigTest {

    @Test
    fun `the container's limits are the configured document size plus headroom`() {
        val properties = TafelAdminProperties().apply { storage.maxDocumentSize = DataSize.ofMegabytes(40) }

        val multipartConfig = MultipartConfig().multipartConfigElement(properties)

        val expectedBytes = DataSize.ofMegabytes(40).toBytes() + MultipartConfig.HEADROOM.toBytes()
        assertThat(multipartConfig.maxFileSize).isEqualTo(expectedBytes)
        assertThat(multipartConfig.maxRequestSize).isEqualTo(expectedBytes)
    }

    @Test
    fun `the container's ceiling stays above the document limit`() {
        val properties = TafelAdminProperties()

        val multipartConfig = MultipartConfig().multipartConfigElement(properties)

        assertThat(multipartConfig.maxFileSize).isGreaterThan(properties.storage.maxDocumentSize.toBytes())
    }

    /**
     * Spring Boot configures multipart itself unless something else already has, and its own default
     * caps a file at 1MB - so a bean that failed to displace the auto-configured one would refuse
     * every real document scan while every unit test here still passed.
     */
    @Test
    fun `spring boot's own multipart configuration backs off`() {
        WebApplicationContextRunner()
            .withConfiguration(AutoConfigurations.of(MultipartAutoConfiguration::class.java))
            .withBean(TafelAdminProperties::class.java)
            .withUserConfiguration(MultipartConfig::class.java)
            .run { context ->
                assertThat(context.getBean(MultipartConfigElement::class.java).maxFileSize)
                    .isEqualTo(MultipartConfig().multipartConfigElement(TafelAdminProperties()).maxFileSize)
            }
    }
}
