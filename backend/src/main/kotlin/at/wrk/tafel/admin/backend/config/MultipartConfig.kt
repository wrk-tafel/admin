package at.wrk.tafel.admin.backend.config

import at.wrk.tafel.admin.backend.config.properties.TafelAdminProperties
import jakarta.servlet.MultipartConfigElement
import org.springframework.boot.servlet.MultipartConfigFactory
import org.springframework.context.annotation.Bean
import org.springframework.context.annotation.Configuration
import org.springframework.util.unit.DataSize

/**
 * Sizes the servlet container's multipart limits from `tafeladmin.storage.maxDocumentSize`, so the
 * document limit is one number instead of two that have to be kept in a fixed relationship.
 *
 * The container's ceiling has to sit *above* the business limit: it is enforced while the request is
 * still being parsed and answers with a `MaxUploadSizeExceededException`, whereas
 * `HouseholdDocumentService` rejects the same file with a message saying what the limit is. So the
 * container's job here is only to stop an upload that is far beyond anything the application would
 * accept from being read into memory at all - [HEADROOM] is what keeps the two from meeting: it
 * covers the multipart envelope (boundaries, part headers, the other form fields) plus room for a
 * file that is over the limit but still worth answering properly.
 *
 * Fixed at startup, unlike the business limit it is derived from: the container is configured once
 * when it is built, so raising `maxDocumentSize` past the ceiling this produced needs a restart to
 * be fully effective (see `TafelAdminStorageProperties.maxDocumentSize`).
 *
 * Overrides Spring Boot's own `multipartConfigElement` bean, which is `@ConditionalOnMissingBean` -
 * hence no `spring.servlet.multipart.max-file-size` in `application.yml`, which would be read by a
 * bean that no longer exists.
 */
@Configuration
class MultipartConfig {

    companion object {
        val HEADROOM: DataSize = DataSize.ofMegabytes(5)
    }

    @Bean
    fun multipartConfigElement(tafelAdminProperties: TafelAdminProperties): MultipartConfigElement {
        val maxSize = DataSize.ofBytes(tafelAdminProperties.storage.maxDocumentSize.toBytes() + HEADROOM.toBytes())

        return MultipartConfigFactory().apply {
            setMaxFileSize(maxSize)
            setMaxRequestSize(maxSize)
        }.createMultipartConfig()
    }
}
