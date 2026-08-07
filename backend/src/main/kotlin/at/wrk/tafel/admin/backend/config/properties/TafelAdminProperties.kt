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
    // Kill switch for the scanner-folder document picker, independent of whether scannerPath
    // happens to be set: an environment that has the share mounted but shouldn't offer the feature
    // (or where the share is misbehaving and the once-per-second poll needs to stop) can turn it
    // off here without editing the mount configuration. Defaults to true so environments with a
    // scannerPath keep working unchanged; with no scannerPath the feature is off either way.
    val scannerEnabled: Boolean = true,
) {
    /**
     * Whether the scanner folder is available at all - the single rule both the backend
     * (`ScannerFileService`) and the frontend (via `ConfigController`) go by, so neither can
     * decide the feature is on while the other has it off.
     *
     * Deliberately answered from configuration alone rather than by probing the filesystem: a share
     * that is momentarily unreachable should surface as an empty file list, not make the whole
     * feature disappear from the UI mid-shift.
     */
    val scannerFolderAvailable: Boolean
        get() = scannerEnabled && !scannerPath.isNullOrBlank()
}

@ExcludeFromTestCoverage
data class TafelAdminPushProperties(
    // A VAPID keypair identifies this server to browser push services. Both values must be the
    // RAW key material, base64url-encoded (NOT the PEM file's own base64, which wraps DER/ASN.1
    // structure around the raw bytes and will fail to decode). Generate and extract with:
    //
    //   openssl ecparam -name prime256v1 -genkey -noout -out vapid.pem
    //   openssl ec -in vapid.pem -pubout -outform DER | tail -c 65 | base64 -w 0 | tr '+/' '-_' | tr -d '='; echo          # -> vapidPublicKey (65 raw bytes, 0x04-prefixed uncompressed point)
    //   openssl ec -in vapid.pem -outform DER | tail -c +8 | head -c 32 | base64 -w 0 | tr '+/' '-_' | tr -d '='; echo     # -> vapidPrivateKey (32 raw bytes)
    //   rm vapid.pem                                                                                                      # both values are now in the config - don't leave the key material on disk
    //
    // (`base64 -w 0` disables line-wrapping so the output is a single line, easy to copy-paste as
    // one value - GNU coreutils' base64 defaults to wrapping at 76 characters otherwise, and with
    // -w 0 it also drops the trailing newline, so the trailing `; echo` just restores a clean
    // shell prompt on its own line afterward - it has no effect on the copied value itself.)
    //
    // Not set here on purpose - only mounted in prod via /app/config/config.yml (same reasoning
    // as TafelAdminSupportProperties.githubToken).
    val vapidPublicKey: String? = null,
    val vapidPrivateKey: String? = null,
    // Contact address browser push services may use to reach the sender, per RFC 8292 - a mailto:
    // URI or an https: URL. Not defaulted since it must be a real, reachable contact.
    val vapidSubject: String? = null,
)
