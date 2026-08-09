package at.wrk.tafel.admin.backend.common.auth.components

import at.wrk.tafel.admin.backend.common.auth.model.TafelUser
import at.wrk.tafel.admin.backend.common.auth.model.UserPermissions
import at.wrk.tafel.admin.backend.config.properties.TafelAdminInitialAdminProperties
import at.wrk.tafel.admin.backend.config.properties.TafelAdminProperties
import at.wrk.tafel.admin.backend.database.model.auth.UserRepository
import org.slf4j.LoggerFactory
import org.springframework.boot.ApplicationArguments
import org.springframework.boot.ApplicationRunner
import org.springframework.security.core.authority.SimpleGrantedAuthority
import org.springframework.stereotype.Component

/**
 * Bootstraps a brand-new installation with one administrator account, so a deployment against an
 * empty database can be logged into and set up from the UI rather than needing a hand-written SQL
 * insert before it is usable at all.
 *
 * The trigger is deliberately "the `users` table is empty", not a flag an operator sets for the
 * first boot and clears afterwards: an empty user table is the one state in which this can neither
 * overwrite anything nor hand out an account nobody asked for, and it is self-clearing - the very
 * account created here makes every later start a no-op. An existing installation therefore never
 * sees this code do anything, whatever its configuration says.
 *
 * The account is created with [UserPermissions.ADMINISTRATOR] only, which grants every other
 * permission implicitly (see its KDoc), and with `passwordChangeRequired`, so the password this
 * logs - or the one an operator configured - cannot stay in use.
 *
 * Runs as an [ApplicationRunner] rather than from a Flyway migration on purpose: a migration would
 * have to ship a fixed password hash, identical on every installation and readable in this
 * repository. Generating one per installation needs the application's own password encoder and
 * validation rules, which only exist once the context is up.
 */
@Component
class InitialAdminUserService(
    private val userRepository: UserRepository,
    private val userDetailsManager: TafelUserDetailsManager,
    private val tafelPasswordGenerator: TafelPasswordGenerator,
    private val tafelAdminProperties: TafelAdminProperties,
) : ApplicationRunner {

    companion object {
        private val logger = LoggerFactory.getLogger(InitialAdminUserService::class.java)
    }

    override fun run(args: ApplicationArguments) = createInitialAdminUserIfMissing()

    fun createInitialAdminUserIfMissing() {
        val properties = tafelAdminProperties.setup.initialAdmin
        if (!properties.enabled) {
            logger.debug("Initial administrator setup is disabled")
            return
        }

        if (userRepository.count() > 0) {
            logger.debug("Users already exist - skipping initial administrator setup")
            return
        }

        createInitialAdmin(properties)
    }

    private fun createInitialAdmin(properties: TafelAdminInitialAdminProperties) {
        val generatedPassword = properties.password == null
        val password = properties.password ?: tafelPasswordGenerator.generatePassword()

        val adminUser = TafelUser(
            id = null,
            username = properties.username,
            password = password,
            enabled = true,
            personnelNumber = properties.personnelNumber,
            firstname = properties.firstname,
            lastname = properties.lastname,
            // Grants every other permission implicitly, so the account can configure the whole
            // installation - including creating the real user accounts.
            authorities = listOf(SimpleGrantedAuthority(UserPermissions.ADMINISTRATOR.key)),
            // Whoever logs in first has to replace the password below before anything else.
            passwordChangeRequired = true,
        )

        try {
            userDetailsManager.createUser(adminUser)
        } catch (e: PasswordChangeException) {
            // Only reachable for a configured password - a generated one satisfies the rules by
            // construction. Failing the startup is the point: the alternative is an installation
            // that came up with no way to log into it.
            throw IllegalStateException(
                "Configured initial administrator password is invalid: ${e.message} " +
                    "${e.validationDetails.orEmpty()}",
                e,
            )
        }

        if (generatedPassword) {
            logger.warn(
                "Created initial administrator '{}' with the generated password '{}' - " +
                    "log in with it now and change it, this is the only time it is shown.",
                properties.username,
                password,
            )
        } else {
            logger.info(
                "Created initial administrator '{}' with the configured password - it has to be changed at first login.",
                properties.username,
            )
        }
    }
}
