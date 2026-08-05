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
 *
 * Since dev/test/prod share one origin at different path prefixes rather than separate domains,
 * the static "Tafel Admin" title/manifest name would otherwise be indistinguishable between them -
 * this also rewrites the page title/apple-mobile-web-app-title and (via [manifest]) the PWA
 * manifest's name/short_name to include tafeladmin.environmentLabel, so each environment installs
 * as a clearly separate home-screen app (see #3027).
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

    @GetMapping("/manifest.webmanifest", produces = ["application/manifest+json"])
    fun manifest(): ResponseEntity<String> {
        val resource = resourceLoader.getResource(staticResourceLocation() + "manifest.webmanifest")
        if (!resource.exists()) {
            return ResponseEntity.notFound().build()
        }

        val json = resource.inputStream.use { it.readBytes() }.toString(StandardCharsets.UTF_8)
        val templatedJson = json
            .replace("\"name\": \"Tafel Admin\"", "\"name\": \"$brandedTitle\"")
            .replace("\"short_name\": \"Tafel Admin\"", "\"short_name\": \"$brandedTitle\"")

        return ResponseEntity.ok()
            .contentType(MediaType.valueOf("application/manifest+json"))
            .body(templatedJson)
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
            .replace("<title>Tafel Admin</title>", "<title>$brandedTitle</title>")
            .replace(
                "<meta name=\"apple-mobile-web-app-title\" content=\"Tafel Admin\">",
                "<meta name=\"apple-mobile-web-app-title\" content=\"$brandedTitle\">",
            )

        return ResponseEntity.ok()
            .contentType(MediaType.TEXT_HTML)
            .body(templatedHtml)
    }

    private val brandedTitle: String
        get() {
            val label = tafelAdminProperties.environmentLabel.trim()
            return if (label.isEmpty()) "Tafel Admin" else "Tafel Admin ($label)"
        }
}
