package at.tafel1030.admin.backend.config

import org.springframework.boot.web.server.WebServerFactoryCustomizer
import org.springframework.boot.web.servlet.server.ConfigurableServletWebServerFactory
import org.springframework.context.annotation.Bean
import org.springframework.context.annotation.Configuration

@Configuration
class WebConfig {
    @Bean
    fun webServerFactoryCustomizer(): WebServerFactoryCustomizer<ConfigurableServletWebServerFactory>? {
        return WebServerFactoryCustomizer { factory: ConfigurableServletWebServerFactory ->
            factory.setContextPath("/api")
        }
    }
}