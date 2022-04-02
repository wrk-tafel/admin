package at.wrk.tafel.admin.backend.context.cache

import com.github.benmanes.caffeine.cache.Caffeine
import org.springframework.cache.annotation.EnableCaching
import org.springframework.cache.caffeine.CaffeineCache
import org.springframework.context.annotation.Bean
import org.springframework.context.annotation.Configuration
import java.util.concurrent.TimeUnit

@Configuration
@EnableCaching
class CacheConfig {

    @Bean
    fun countriesCache(): CaffeineCache {
        return CaffeineCache(
            "countries",
            Caffeine.newBuilder().expireAfterWrite(1, TimeUnit.DAYS).recordStats().build()
        )
    }
}
