package at.wrk.tafel.admin.backend.modules.config

import at.wrk.tafel.admin.backend.common.ExcludeFromTestCoverage
import at.wrk.tafel.admin.backend.config.properties.TafelAdminProperties

/**
 * The one place the deployment's configuration is turned into what the frontend gets to see, used
 * both by the endpoint that answers a fresh page load (`ConfigController`) and by the one that
 * pushes a live config change into pages that are already open (`ConfigChangePublisher`) - so the
 * two can't drift into reporting different things about the same deployment.
 */
fun TafelAdminProperties.toConfigResponse(): ConfigResponse = ConfigResponse(
    version = version,
    buildTime = buildTime,
    scannerFolderEnabled = scannerFolderAvailable,
)

@ExcludeFromTestCoverage
data class ConfigResponse(
    val version: String,
    val buildTime: String,
    /**
     * Whether this environment offers the scanner-folder document source (see
     * `TafelAdminProperties.scannerFolderAvailable`). The frontend hides the "Scanner"
     * source entirely when false - without it the picker would offer a tab that can never list
     * anything, indistinguishable from "nobody has scanned yet".
     */
    val scannerFolderEnabled: Boolean,
)

/**
 * What an anonymous caller may read (see `ConfigController.getPublicConfig`). [environmentLabel] is
 * empty on production and set per deployment elsewhere ("DEV", "TEST"), which is what the login
 * page shows as a full-width banner above the login card so it's obvious which environment is
 * being logged into.
 * [accountLockoutDurationInSeconds] mirrors `security.loginAttempts.lockoutDurationInSeconds`
 * (`ApplicationProperties`, fixed at startup) so the login page's lockout message can tell a locked-
 * out user how long to wait without hardcoding a number that could drift from the actual setting.
 */
@ExcludeFromTestCoverage
data class PublicConfigResponse(
    val environmentLabel: String,
    val accountLockoutDurationInSeconds: Long,
)
