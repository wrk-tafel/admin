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
    val storage: TafelAdminStorageProperties = TafelAdminStorageProperties(),
    val push: TafelAdminPushProperties? = null,
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

@ExcludeFromTestCoverage
data class TafelAdminPushProperties(
    // A VAPID keypair identifies this server to browser push services; generate once with
    // `openssl ecparam -name prime256v1 -genkey -noout` and base64url-encode the raw private
    // scalar (32 bytes) / uncompressed public point (65 bytes, 0x04 prefix). Not set here on
    // purpose - only mounted in prod via /app/config/config.yml (same reasoning as
    // TafelAdminSupportProperties.githubToken).
    val vapidPublicKey: String? = null,
    val vapidPrivateKey: String? = null,
    // Contact address browser push services may use to reach the sender, per RFC 8292 - a mailto:
    // URI or an https: URL. Not defaulted since it must be a real, reachable contact.
    val vapidSubject: String? = null,
)
