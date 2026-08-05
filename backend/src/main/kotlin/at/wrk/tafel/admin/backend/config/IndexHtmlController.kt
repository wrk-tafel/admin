package at.wrk.tafel.admin.backend.config

import at.wrk.tafel.admin.backend.config.properties.TafelAdminProperties
import jakarta.servlet.http.HttpServletRequest
import org.springframework.core.io.ResourceLoader
import org.springframework.http.MediaType
import org.springframework.http.ResponseEntity
import org.springframework.stereotype.Controller
import org.springframework.web.bind.annotation.GetMapping
import org.springframework.web.bind.annotation.PathVariable
import java.nio.charset.StandardCharsets

/**
 * The frontend is built once and deployed unchanged behind reverse proxies mounting it at
 * different path prefixes (e.g. "/verwaltung-dev/", stripped by nginx before the request reaches
 * this app - see tafeladmin.server.relativeBaseUrl, also used for the JWT cookie path). index.html
 * ships with `<base href="/">` for local `ng serve` use; this controller rewrites that to the
 * configured prefix so relative asset/API URLs still resolve correctly once nginx has stripped it
 * (see #2972 for what breaks otherwise).
 *
 * It also acts as the SPA's fallback route: a direct navigation/bookmark/refresh to a client-side
 * route (e.g. "/login", "/kunden/suchen") isn't a real server path, but the router needs it to
 * still resolve to the app shell rather than 404 - Angular's PathLocationStrategy then picks the
 * intended route back up from the URL itself once the app has loaded. Static resource requests
 * (real files, all of which have an extension in this build) and api requests are excluded so real
 * 404s stay real 404s.
 */
@Controller
class IndexHtmlController(
    private val tafelAdminProperties: TafelAdminProperties,
    private val resourceLoader: ResourceLoader,
) {

    @GetMapping("/", produces = [MediaType.TEXT_HTML_VALUE])
    fun index(): ResponseEntity<String> = buildIndexResponse()

    @GetMapping(
        value = ["/{path:[^\\.]*}", "/**/{path:[^\\.]*}"],
        produces = [MediaType.TEXT_HTML_VALUE],
    )
    fun spaFallback(@PathVariable path: String, request: HttpServletRequest): ResponseEntity<String> {
        if (request.requestURI.startsWith("/api/")) {
            return ResponseEntity.notFound().build()
        }
        return buildIndexResponse()
    }

    private fun buildIndexResponse(): ResponseEntity<String> {
        val resource = resourceLoader.getResource(staticResourceLocation() + "index.html")
        if (!resource.exists()) {
            return ResponseEntity.notFound().build()
        }

        val html = resource.inputStream.use { it.readBytes() }.toString(StandardCharsets.UTF_8)
        // A <base href> without a trailing slash treats its last path segment as a filename, so a
        // relative URL replaces it instead of appending to it (e.g. "/verwaltung-dev" + "main.js"
        // resolves to "/main.js", not "/verwaltung-dev/main.js") - relativeBaseUrl historically only
        // fed the cookie path, where that distinction doesn't matter, so not every environment's
        // config has a trailing slash. Normalize here rather than relying on ops config for it.
        val relativeBaseUrl = tafelAdminProperties.server.relativeBaseUrl.let {
            if (it.endsWith("/")) it else "$it/"
        }
        val templatedHtml = html.replace("<base href=\"/\">", "<base href=\"$relativeBaseUrl\">")

        return ResponseEntity.ok()
            .contentType(MediaType.TEXT_HTML)
            .body(templatedHtml)
    }
}
