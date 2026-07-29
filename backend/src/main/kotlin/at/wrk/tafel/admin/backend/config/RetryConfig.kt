package at.wrk.tafel.admin.backend.config

import at.wrk.tafel.admin.backend.common.ExcludeFromTestCoverage
import org.springframework.context.annotation.Bean
import org.springframework.context.annotation.Configuration
import org.springframework.retry.support.RetryTemplate
import java.time.Duration

/**
 * Shared retry policy for post-distribution-close work that isolates itself into independent steps
 * (see `distribution.internal.DistributionEndedEventListener` and
 * `reporting.internal.DistributionClosedEventListener`): up to [MAX_ATTEMPTS] attempts with a fixed
 * backoff between them, retrying on any `Exception`.
 */
@Configuration
@ExcludeFromTestCoverage
class RetryConfig {

    companion object {
        const val MAX_ATTEMPTS = 3
    }

    @Bean
    fun retryTemplate(): RetryTemplate = RetryTemplate.builder()
        .maxAttempts(MAX_ATTEMPTS)
        .fixedBackoff(Duration.ofSeconds(2))
        .retryOn(Exception::class.java)
        .build()
}
