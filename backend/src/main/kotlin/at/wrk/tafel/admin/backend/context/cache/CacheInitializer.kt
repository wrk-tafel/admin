package at.wrk.tafel.admin.backend.context.cache

import at.wrk.tafel.admin.backend.modules.generic.CountryRestRepository
import org.springframework.stereotype.Component
import javax.annotation.PostConstruct

@Component
class CacheInitializer(
    private val countryRestRepository: CountryRestRepository
) {
    @PostConstruct
    fun init() {
        countryRestRepository.findAll()
    }
}
