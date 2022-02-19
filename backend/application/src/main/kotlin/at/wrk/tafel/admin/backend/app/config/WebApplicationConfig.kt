package at.wrk.tafel.admin.backend.app.config

import at.wrk.tafel.admin.backend.common.ExcludeFromTestCoverage
import org.springframework.context.annotation.Configuration
import org.springframework.core.io.ClassPathResource
import org.springframework.core.io.Resource
import org.springframework.web.servlet.config.annotation.ResourceHandlerRegistry
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer
import org.springframework.web.servlet.resource.PathResourceResolver

@Configuration
@ExcludeFromTestCoverage
class WebApplicationConfig : WebMvcConfigurer {

    override fun addResourceHandlers(registry: ResourceHandlerRegistry) {
        // Redirect per default to static resources for url-processing by angular
        registry.addResourceHandler("/**")
            .addResourceLocations("classpath:/static/")
            .resourceChain(true)
            .addResolver(object : PathResourceResolver() {
                override fun getResource(resourcePath: String, location: Resource): Resource {
                    val requestedResource: Resource = location.createRelative(resourcePath)
                    return if (requestedResource.exists() && requestedResource.isReadable) requestedResource
                    else ClassPathResource("/static/index.html")
                }
            })
    }
}
