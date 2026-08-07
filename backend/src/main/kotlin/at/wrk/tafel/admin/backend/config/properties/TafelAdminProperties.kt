package at.wrk.tafel.admin.backend.config.properties

import at.wrk.tafel.admin.backend.common.ExcludeFromTestCoverage
import org.springframework.boot.context.properties.ConfigurationProperties

@ConfigurationProperties(prefix = "tafeladmin")
@ExcludeFromTestCoverage
data class TafelAdminProperties(
    val version: String = "dev",
    val buildTime: String = "unknown",
    // Set per-deployment (e.g. "DEV", "TEST", empty for prod) alongside server.relativeBaseUrl -
    // dev/test/prod share one origin at different path prefixes, so without this the PWA install
    // title/manifest would look identical across all three (see #3027).
    val environmentLabel: String = "",
    val mail: TafelAdminMailProperties? = null,
    val server: TafelAdminServerProperties = TafelAdminServerProperties(),
    val support: TafelAdminSupportProperties? = null,
    val storage: TafelAdminStorageProperties = TafelAdminStorageProperties(),
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
    // Prepended to every issue title so it's obvious which environment a support request came from.
    val titlePrefix: String,
)

@ExcludeFromTestCoverage
data class TafelAdminStorageProperties(
    val documentsPath: String = "documents",
    // Mount point for a NAS share a physical scanner writes to. Not every environment has one, so
    // this stays null unless explicitly set (same reasoning as TafelAdminSupportProperties.githubToken).
    val scannerPath: String? = null,
)
