package at.wrk.tafel.admin.backend.context.cache

import org.springframework.cache.annotation.EnableCaching
import org.springframework.context.annotation.Configuration

@Configuration
@EnableCaching
class CacheConfig {

    // TODO
    /*
    @Bean
    fun demoCache(): CaffeineCache {
        return CaffeineCache(
            "demo",
            Caffeine.newBuilder().expireAfterWrite(1, TimeUnit.DAYS).recordStats().build()
        )
    }
     */
}
