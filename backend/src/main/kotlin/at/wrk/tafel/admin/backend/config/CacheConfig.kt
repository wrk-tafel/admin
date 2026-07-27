package at.wrk.tafel.admin.backend.config

import org.springframework.cache.CacheManager
import org.springframework.cache.annotation.EnableCaching
import org.springframework.cache.concurrent.ConcurrentMapCacheManager
import org.springframework.context.annotation.Bean
import org.springframework.context.annotation.Configuration

/**
 * Static values (income limits, tolerance, family bonus, ...) are cached for the process lifetime -
 * getHouseholdsAboveLimit() re-validates every valid household, and each validation hits
 * static_values several times, so without caching that endpoint re-queries the same rows once per
 * household. Writes go through SettingsService's static-value CRUD, which evicts these caches on
 * every create/update so admin-made changes still take effect immediately.
 */
@Configuration
@EnableCaching
class CacheConfig {

    @Bean
    fun cacheManager(): CacheManager {
        return ConcurrentMapCacheManager()
    }

}
