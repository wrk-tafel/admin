package at.wrk.tafel.admin.backend.config.properties

import at.wrk.tafel.admin.backend.common.ExcludeFromTestCoverage
import org.springframework.boot.context.properties.ConfigurationProperties

/**
 * Mutable, JavaBean-bound on purpose - that is what makes this application's configuration
 * reloadable at runtime (see [ConfigFileReloadService]).
 *
 * Spring Cloud's `ConfigurationPropertiesRebinder` re-binds the *existing* bean instance when the
 * environment changes, so every consumer that injected it keeps seeing current values without
 * knowing anything about reloading. That only works for setter binding: a Kotlin primary
 * constructor with parameters makes Spring Boot deduce value-object binding and produce an
 * instance that can only ever be replaced, never updated - which is why these classes declare a
 * no-arg constructor and their properties in the body rather than as constructor parameters.
 *
 * The trade-off is that a reload mutates fields other threads may be reading at that moment. A
 * reader can therefore briefly see one setting updated and another not (they are written one at a
 * time), and there is no happens-before edge guaranteeing it sees the new value on the very next
 * read. Both are inherent to how Spring Cloud refreshes configuration and are acceptable here:
 * reloads are operator-driven, seconds apart from anything that reads them, and every value is
 * re-read per request rather than cached.
 */
@ConfigurationProperties(prefix = "tafeladmin")
@ExcludeFromTestCoverage
class TafelAdminProperties {
    var version: String = "dev"
    var buildTime: String = "unknown"

    // Set per-deployment (e.g. "DEV", "TEST", empty for prod) alongside server.relativeBaseUrl -
    // dev/test/prod share one origin at different path prefixes, so without this the PWA install
    // title/manifest would look identical across all three (see #3027).
    var environmentLabel: String = ""

    var mail: TafelAdminMailProperties? = null
    var server: TafelAdminServerProperties = TafelAdminServerProperties()
    var support: TafelAdminSupportProperties? = null
    var storage: TafelAdminStorageProperties = TafelAdminStorageProperties()
    var push: TafelAdminPushProperties? = null
    var testdata: TafelAdminTestdataProperties = TafelAdminTestdataProperties()
}

@ExcludeFromTestCoverage
class TafelAdminTestdataProperties {
    /**
     * Wipes and re-creates the schema on startup so the `testdata` migrations can seed it from
     * scratch (`FlywayConfig`). Read once during startup by definition - Flyway has finished long
     * before anyone could edit the config file - so unlike the rest of this class, reloading it has
     * no meaning.
     */
    var enabled: Boolean = false
}

@ExcludeFromTestCoverage
class TafelAdminMailProperties {
    var from: String = ""
    var subjectPrefix: String? = null
    var defaultRecipientsBcc: List<String>? = emptyList()
}

@ExcludeFromTestCoverage
class TafelAdminServerProperties {
    var relativeBaseUrl: String = "/"
}

@ExcludeFromTestCoverage
class TafelAdminSupportProperties {
    // Personal access token (Issues: Read and write) for creating support-request issues via the
    // GitHub REST API. Not set here on purpose - only mounted in prod via /app/config/config.yml.
    var githubToken: String? = null

    var githubRepository: String = ""

    // Prepended to every issue title so it's obvious which environment a support request came from.
    var titlePrefix: String = ""
}

@ExcludeFromTestCoverage
class TafelAdminStorageProperties {
    var documentsPath: String = "documents"

    // Mount point for a NAS share a physical scanner writes to. Not every environment has one, so
    // this stays null unless explicitly set (same reasoning as TafelAdminSupportProperties.githubToken).
    var scannerPath: String? = null

    // Kill switch for the scanner-folder document picker, independent of whether scannerPath
    // happens to be set: an environment that has the share mounted but shouldn't offer the feature
    // (or where the share is misbehaving and the once-per-second poll needs to stop) can turn it
    // off here without editing the mount configuration. Defaults to true so environments with a
    // scannerPath keep working unchanged; with no scannerPath the feature is off either way.
    var scannerEnabled: Boolean = true

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
class TafelAdminPushProperties {
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
    var vapidPublicKey: String? = null
    var vapidPrivateKey: String? = null

    // Contact address browser push services may use to reach the sender, per RFC 8292 - a mailto:
    // URI or an https: URL. Not defaulted since it must be a real, reachable contact.
    var vapidSubject: String? = null
}
