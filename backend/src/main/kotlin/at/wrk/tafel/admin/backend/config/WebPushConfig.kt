package at.wrk.tafel.admin.backend.config

import at.wrk.tafel.admin.backend.config.properties.TafelAdminProperties
import nl.martijndwars.webpush.PushService
import org.apache.http.impl.client.CloseableHttpClient
import org.apache.http.impl.client.HttpClients
import org.bouncycastle.jce.provider.BouncyCastleProvider
import org.springframework.context.annotation.Bean
import org.springframework.context.annotation.Configuration
import java.security.Security

/**
 * Builds the [PushService] bean `push.internal.WebPushSenderService` sends Web Push notifications
 * (VAPID) through - `null` if the VAPID keypair isn't configured (see
 * [at.wrk.tafel.admin.backend.config.properties.TafelAdminPushProperties]).
 *
 * A dedicated `@Bean` factory method rather than a Kotlin constructor default value directly on
 * `WebPushSenderService`: Spring's Kotlin support calls the constructor via
 * `KCallable.callBy`/reflection when it isn't a plain no-default constructor, and a default
 * parameter expression that reads another constructor parameter doesn't survive that reflective
 * path in a packaged (non-dev) build - it threw `ArrayIndexOutOfBoundsException` at boot in the
 * `build-push-image` CI job, which actually boots the app, unlike a unit test constructing the
 * class directly. Keeping construction here, behind a real Spring `@Bean` method with a single
 * plain parameter, sidesteps that reflective path entirely.
 */
@Configuration
class WebPushConfig {

    init {
        if (Security.getProvider(BouncyCastleProvider.PROVIDER_NAME) == null) {
            Security.addProvider(BouncyCastleProvider())
        }
    }

    @Bean
    fun pushService(tafelAdminProperties: TafelAdminProperties): PushService? {
        val vapid = tafelAdminProperties.push
        // Blank, not just null: a YAML `~` value can surface as an empty string rather than a
        // true absent/null property once flattened by Spring's YAML property source loader, so
        // a plain null-check alone isn't enough to detect "unconfigured" here.
        val publicKey = vapid?.vapidPublicKey?.takeIf { it.isNotBlank() }
        val privateKey = vapid?.vapidPrivateKey?.takeIf { it.isNotBlank() }
        val subject = vapid?.vapidSubject?.takeIf { it.isNotBlank() }
        if (publicKey == null || privateKey == null || subject == null) {
            return null
        }
        return PushService(publicKey, privateKey, subject)
    }

    /**
     * The client `push.internal.WebPushSenderService` sends its (self-assembled) push requests
     * with - see that class for why the library's own `PushService.send` isn't used. Spring closes
     * it on shutdown via the inferred `close()` destroy method.
     */
    @Bean
    fun webPushHttpClient(): CloseableHttpClient = HttpClients.createSystem()
}
