package at.wrk.tafel.admin.backend.modules.config

import at.wrk.tafel.admin.backend.common.ExcludeFromTestCoverage
import at.wrk.tafel.admin.backend.common.auth.components.PasswordRuleDescriptions
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
        descriptions = PasswordRuleDescriptions.of(password),
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
    /**
     * The length limits on their own, because they are the two rules the form can usefully check
     * itself while the user types. Everything else is left to the backend, which is the only side
     * that enforces any of it.
     */
    val minLength: Int,
    val maxLength: Int,
    /**
     * The whole configured policy as German sentences, ready to list - see
     * `PasswordRuleDescriptions` for why the wording is decided here rather than in the frontend.
     */
    val descriptions: List<String>,
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
