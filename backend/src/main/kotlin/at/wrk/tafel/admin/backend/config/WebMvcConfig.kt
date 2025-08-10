package at.wrk.tafel.admin.backend.config

import at.wrk.tafel.admin.backend.common.api.ActiveDistributionRequiredInterceptor
import org.springframework.context.annotation.Configuration
import org.springframework.web.servlet.config.annotation.InterceptorRegistry
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer

@Configuration
class WebMvcConfig(
    private val activeDistributionRequiredInterceptor: ActiveDistributionRequiredInterceptor
) : WebMvcConfigurer {

    override fun addInterceptors(registry: InterceptorRegistry) {
        registry.addInterceptor(activeDistributionRequiredInterceptor)
    }

}
