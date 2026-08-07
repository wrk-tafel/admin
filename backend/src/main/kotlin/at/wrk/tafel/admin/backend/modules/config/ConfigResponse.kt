package at.wrk.tafel.admin.backend.modules.config

import at.wrk.tafel.admin.backend.common.ExcludeFromTestCoverage

@ExcludeFromTestCoverage
data class ConfigResponse(
    val version: String,
    val buildTime: String,
    /**
     * Whether this environment offers the scanner-folder document source (see
     * `TafelAdminStorageProperties.scannerFolderAvailable`). The frontend hides the "Scanner"
     * source entirely when false - without it the picker would offer a tab that can never list
     * anything, indistinguishable from "nobody has scanned yet".
     */
    val scannerFolderEnabled: Boolean,
)

/**
 * What an anonymous caller may read (see `ConfigController.getPublicConfig`). [environmentLabel] is
 * empty on production and set per deployment elsewhere ("DEV", "TEST"), which is what the login
 * page shows beneath its title so it's obvious which environment is being logged into.
 */
@ExcludeFromTestCoverage
data class PublicConfigResponse(
    val environmentLabel: String,
)
