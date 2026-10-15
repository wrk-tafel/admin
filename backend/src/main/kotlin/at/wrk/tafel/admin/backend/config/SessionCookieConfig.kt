package at.wrk.tafel.admin.backend.config

import at.wrk.tafel.admin.backend.common.ExcludeFromTestCoverage
import at.wrk.tafel.admin.backend.common.auth.components.TafelSessionAttributes
import at.wrk.tafel.admin.backend.config.properties.ApplicationProperties
import org.springframework.boot.session.autoconfigure.DefaultCookieSerializerCustomizer
import org.springframework.context.annotation.Bean
import org.springframework.context.annotation.Configuration

/**
 * The cookie the login session's id travels in (ADR-0070). Its path comes from
 * `server.servlet.session.cookie.path` (`tafeladmin.server.relativeBaseUrl`); `Secure` is left to
 * Spring Session, which sets it whenever the request arrived over HTTPS - behind the reverse proxy
 * that is what `server.forward-headers-strategy` makes `request.isSecure` say.
 *
 * - `HttpOnly`: no script ever needs the session id.
 * - `SameSite=Strict`: the application never needs the cookie on a request another site started; the
 *   API calls the page itself makes are same-site and carry it either way.
 * - `Max-Age` is the session's lifetime: the cookie survives a browser restart for as long as the
 *   session itself would, and the server decides the rest (see `TafelSessionAuthProvider`).
 */
@Configuration
@ExcludeFromTestCoverage
class SessionCookieConfig {

    @Bean
    fun sessionCookieCustomizer(applicationProperties: ApplicationProperties) = DefaultCookieSerializerCustomizer { serializer ->
        serializer.setCookieName(TafelSessionAttributes.COOKIE_NAME)
        serializer.setUseHttpOnlyCookie(true)
        serializer.setSameSite("Strict")
        serializer.setCookieMaxAge(applicationProperties.security.session.lifetimeInSeconds.toInt())
    }
}
