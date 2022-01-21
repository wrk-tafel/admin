package at.wrk.tafel.admin.backend.config

import com.fasterxml.jackson.databind.ObjectMapper
import org.springframework.context.annotation.Configuration
import org.springframework.core.io.ByteArrayResource
import org.springframework.web.servlet.config.annotation.EnableWebMvc
import org.springframework.web.servlet.config.annotation.ResourceHandlerRegistry
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer

@Configuration
@EnableWebMvc
class MvcConfig(
    private val tafelAdminProperties: TafelAdminProperties
) : WebMvcConfigurer {

    override fun addResourceHandlers(registry: ResourceHandlerRegistry) {
        val objectMapper = ObjectMapper()
        val configBytes =
            objectMapper.writeValueAsBytes(FrontendConfig(apiBaseUrl = tafelAdminProperties.baseUrl))

        registry
            .addResourceHandler("/frontend-config.json")
            .addResourceLocations(ByteArrayResource(configBytes))
    }

}

data class FrontendConfig(
    val apiBaseUrl: String
)
