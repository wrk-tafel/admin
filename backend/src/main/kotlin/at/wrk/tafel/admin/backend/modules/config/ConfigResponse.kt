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
    buildDate = buildDate,
    scannerFolderEnabled = scannerFolderAvailable,
    environmentLabel = environmentLabel.trim(),
)

@ExcludeFromTestCoverage
data class ConfigResponse(
    val version: String,
    val buildDate: String,
    /**
     * Whether this environment offers the scanner-folder document source (see
     * `TafelAdminProperties.scannerFolderAvailable`). The frontend hides the "Scanner"
     * source entirely when false - without it the picker would offer a tab that can never list
     * anything, indistinguishable from "nobody has scanned yet".
     */
    val scannerFolderEnabled: Boolean,
    /**
     * Which environment this deployment is ("DEV", "TEST"), empty on production. The shell renders
     * it as a banner so an already-logged-in session stays visibly distinguishable from production,
     * the same fact [PublicConfigResponse.environmentLabel] gives the login page before that.
     */
    val environmentLabel: String,
)

/**
 * What an anonymous caller may read (see `ConfigController.getPublicConfig`). [environmentLabel] is
 * empty on production and set per deployment elsewhere ("DEV", "TEST"), which is what the login
 * page shows beneath its title so it's obvious which environment is being logged into - the same
 * value [ConfigResponse.environmentLabel] carries on for an already-authenticated session.
 */
@ExcludeFromTestCoverage
data class PublicConfigResponse(
    val environmentLabel: String,
)
