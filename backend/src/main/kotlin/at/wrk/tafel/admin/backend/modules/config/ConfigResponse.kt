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
