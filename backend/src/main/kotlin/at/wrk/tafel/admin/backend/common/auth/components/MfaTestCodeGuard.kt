package at.wrk.tafel.admin.backend.common.auth.components

import at.wrk.tafel.admin.backend.config.properties.TafelAdminProperties
import org.slf4j.LoggerFactory
import org.springframework.boot.ApplicationArguments
import org.springframework.boot.ApplicationRunner
import org.springframework.core.env.Environment
import org.springframework.core.env.Profiles
import org.springframework.stereotype.Component

/**
 * Keeps `tafeladmin.mfa.emailCodeForTests` - a fixed code that replaces the random one of the e-mail method, so
 * that anyone who knows it passes that step - out of a real deployment. It belongs to the `e2e` profile (and to
 * the integration tests' `test` profile) and nowhere else; a stray line in a production `config.yml` would
 * otherwise switch the second factor off without anybody noticing.
 *
 * Two lines of defence, because the configuration is re-read while the application runs (see
 * `ConfigFileReloadService`) and a line added later never passes through startup:
 * - **Startup refuses** when it is set outside those profiles.
 * - **[fixedCode] answers `null` there**, so a value that appears after startup is ignored and the code stays random.
 */
@Component
class MfaTestCodeGuard(
    private val tafelAdminProperties: TafelAdminProperties,
    private val environment: Environment,
) : ApplicationRunner {

    companion object {
        private val log = LoggerFactory.getLogger(MfaTestCodeGuard::class.java)
        private val ALLOWED_PROFILES = Profiles.of("e2e", "test")
    }

    override fun run(args: ApplicationArguments) {
        if (tafelAdminProperties.mfa.emailCodeForTests != null && !profileAllows()) {
            throw IllegalStateException(
                "tafeladmin.mfa.emailCodeForTests is set, but neither the 'e2e' nor the 'test' profile is active - " +
                    "it replaces the e-mailed login code with a fixed one and must never be set on a real deployment",
            )
        }
    }

    /** The fixed code to use instead of a random one, or `null` - always `null` outside the test profiles. */
    fun fixedCode(): String? {
        val code = tafelAdminProperties.mfa.emailCodeForTests ?: return null
        if (!profileAllows()) {
            log.error("tafeladmin.mfa.emailCodeForTests is set outside the e2e/test profiles and is ignored - remove it from the configuration")
            return null
        }
        return code
    }

    private fun profileAllows(): Boolean = environment.acceptsProfiles(ALLOWED_PROFILES)
}
