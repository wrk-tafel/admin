package at.wrk.tafel.admin.backend.config.properties

import at.wrk.tafel.admin.backend.common.ExcludeFromTestCoverage
import org.springframework.boot.context.properties.ConfigurationProperties

@ConfigurationProperties(prefix = "tafeladmin")
@ExcludeFromTestCoverage
data class TafelAdminProperties(
    val version: String = "dev",
    val buildTime: String = "unknown",
    val mail: TafelAdminMailProperties? = null,
    val server: TafelAdminServerProperties = TafelAdminServerProperties(),
    val support: TafelAdminSupportProperties? = null,
)

@ExcludeFromTestCoverage
data class TafelAdminMailProperties(
    val from: String,
    val subjectPrefix: String? = null,
    val defaultRecipientsBcc: List<String>? = emptyList(),
)

@ExcludeFromTestCoverage
data class TafelAdminServerProperties(
    val relativeBaseUrl: String = "/",
)

@ExcludeFromTestCoverage
data class TafelAdminSupportProperties(
    // Personal access token (Issues: Read and write) for creating support-request issues via the
    // GitHub REST API. Not set here on purpose - only mounted in prod via /app/config/config.yml.
    val githubToken: String? = null,
    val githubRepository: String,
)
