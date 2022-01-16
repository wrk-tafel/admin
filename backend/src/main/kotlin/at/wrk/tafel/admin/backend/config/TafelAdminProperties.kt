package at.wrk.tafel.admin.backend.config

import org.springframework.boot.context.properties.ConfigurationProperties
import org.springframework.boot.context.properties.ConstructorBinding

@ConfigurationProperties(prefix = "tafeladmin")
@ConstructorBinding
data class TafelAdminProperties(
    val baseUrl: String?
)
