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
    passwordRules = PasswordRules(
        minLength = password.minLength,
        maxLength = password.maxLength,
        forbiddenWords = password.forbiddenWords,
    ),
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
    /**
     * What a password has to satisfy in this deployment (`tafeladmin.password`). The frontend both
     * describes these rules on the password-change screen and validates against them before
     * submitting, so they have to come from the backend - a hardcoded copy would start advertising
     * rules the backend doesn't apply the moment an installation configures its own.
     */
    val passwordRules: PasswordRules,
)

@ExcludeFromTestCoverage
data class PasswordRules(
    val minLength: Int,
    val maxLength: Int,
    /**
     * Words a password may not contain, matched case-insensitively. Empty means the rule isn't
     * applied at all, and the frontend then lists nothing about forbidden words.
     */
    val forbiddenWords: List<String>,
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
