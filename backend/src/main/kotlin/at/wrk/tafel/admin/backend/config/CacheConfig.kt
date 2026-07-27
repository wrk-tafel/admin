package at.wrk.tafel.admin.backend.config

import org.springframework.cache.CacheManager
import org.springframework.cache.annotation.EnableCaching
import org.springframework.cache.concurrent.ConcurrentMapCacheManager
import org.springframework.context.annotation.Bean
import org.springframework.context.annotation.Configuration

/**
 * Static values (income limits, tolerance, family bonus, ...) are only ever changed via a DB
 * migration shipped with a new deployment, never at runtime - so caching them for the lifetime of
 * the process is safe and needs no eviction.
 */
@Configuration
@EnableCaching
class CacheConfig {

    @Bean
    fun cacheManager(): CacheManager {
        return ConcurrentMapCacheManager()
    }

}
