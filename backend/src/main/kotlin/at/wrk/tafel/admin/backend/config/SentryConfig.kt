package at.wrk.tafel.admin.backend.config

import io.sentry.spring.jakarta.EnableSentry
import org.springframework.context.annotation.Configuration
import org.springframework.core.Ordered

@EnableSentry(
    dsn = "https://f25a136290223630af5b866f4424f095@o4508428461604864.ingest.de.sentry.io/4508428519538768",
    exceptionResolverOrder = Ordered.LOWEST_PRECEDENCE
)
@Configuration
class SentryConfig