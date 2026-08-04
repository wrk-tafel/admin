package at.wrk.tafel.admin.backend.config

import at.wrk.tafel.admin.backend.config.properties.TafelAdminProperties
import org.springframework.core.io.ResourceLoader
import org.springframework.http.MediaType
import org.springframework.http.ResponseEntity
import org.springframework.stereotype.Controller
import org.springframework.web.bind.annotation.GetMapping
import java.nio.charset.StandardCharsets

/**
 * The frontend is built once and deployed unchanged behind reverse proxies mounting it at
 * different path prefixes (e.g. "/verwaltung-dev/", stripped by nginx before the request reaches
 * this app - see tafeladmin.server.relativeBaseUrl, also used for the JWT cookie path). index.html
 * ships with `<base href="/">` for local `ng serve` use; this controller rewrites that to the
 * configured prefix so relative asset/API URLs still resolve correctly once nginx has stripped it
 * (see #2972 for what breaks otherwise).
 */
@Controller
class IndexHtmlController(
    private val tafelAdminProperties: TafelAdminProperties,
    private val resourceLoader: ResourceLoader,
) {

    @GetMapping("/", produces = [MediaType.TEXT_HTML_VALUE])
    fun index(): ResponseEntity<String> {
        val resource = resourceLoader.getResource(staticResourceLocation() + "index.html")
        if (!resource.exists()) {
            return ResponseEntity.notFound().build()
        }

        val html = resource.inputStream.use { it.readBytes() }.toString(StandardCharsets.UTF_8)
        val relativeBaseUrl = tafelAdminProperties.server.relativeBaseUrl
        val templatedHtml = html.replace("<base href=\"/\">", "<base href=\"$relativeBaseUrl\">")

        return ResponseEntity.ok()
            .contentType(MediaType.TEXT_HTML)
            .body(templatedHtml)
    }

}
