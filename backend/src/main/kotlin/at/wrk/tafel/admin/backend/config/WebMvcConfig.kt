package at.wrk.tafel.admin.backend.config

import at.wrk.tafel.admin.backend.common.api.TafelActiveDistributionRequiredInterceptor
import org.springframework.context.annotation.Configuration
import org.springframework.http.CacheControl
import org.springframework.web.servlet.config.annotation.InterceptorRegistry
import org.springframework.web.servlet.config.annotation.ResourceHandlerRegistry
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer
import java.util.concurrent.TimeUnit

@Configuration
class WebMvcConfig(
    private val tafelActiveDistributionRequiredInterceptor: TafelActiveDistributionRequiredInterceptor,
) : WebMvcConfigurer {

    override fun addInterceptors(registry: InterceptorRegistry) {
        registry.addInterceptor(tafelActiveDistributionRequiredInterceptor)
    }

    override fun addResourceHandlers(registry: ResourceHandlerRegistry) {
        // Angular's production build content-hashes these (outputHashing: all), so a new deploy
        // always produces new filenames - safe for browsers to cache indefinitely. Everything else
        // under static-locations (index.html, favicon/icons/manifest, and critically
        // ngsw.json/ngsw-worker.js, which the service worker polls to detect updates) is NOT
        // hashed and must keep Spring Boot's existing no-store default, so it isn't matched here.
        val immutableCache = CacheControl.maxAge(365, TimeUnit.DAYS).cachePublic().immutable()

        registry.addResourceHandler("/main-*.js", "/chunk-*.js", "/styles-*.css")
            .addResourceLocations(staticResourceLocation())
            .setCacheControl(immutableCache)

        // A "/media/**" handler resolves lookups against its location with the "media/" prefix
        // already stripped, so the location itself has to point *into* the media subdirectory -
        // reusing the top-level static location above would silently 404 every font.
        registry.addResourceHandler("/media/**")
            .addResourceLocations("${staticResourceLocation()}media/")
            .setCacheControl(immutableCache)

        // Push notification icons (see PushBroadcastService's payload) are fetched by the browser
        // at display time, not by the page - a device woken by a push has to pull them over a cold,
        // possibly still-reconnecting network, and Chrome drops the icon rather than delaying the
        // notification if that fetch doesn't land. The no-store default these would otherwise
        // inherit forces exactly that fetch on every single notification. These filenames aren't
        // content-hashed, so this is a day rather than the immutable cache above - long enough to
        // survive across notifications, short enough that a changed logo rolls out on its own.
        registry.addResourceHandler("/icons/**")
            .addResourceLocations("${staticResourceLocation()}icons/")
            .setCacheControl(CacheControl.maxAge(1, TimeUnit.DAYS).cachePublic())
    }
}
