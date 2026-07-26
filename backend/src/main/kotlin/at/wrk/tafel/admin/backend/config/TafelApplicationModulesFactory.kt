package at.wrk.tafel.admin.backend.config

import org.springframework.modulith.core.ApplicationModules
import org.springframework.modulith.core.ApplicationModulesFactory

/**
 * The application's main class lives in [at.wrk.tafel.admin.backend], but the actual Spring Modulith modules are
 * nested one level deeper under [at.wrk.tafel.admin.backend.modules] (alongside non-module packages like `common`,
 * `config` and `database`). Without this, Spring Modulith's runtime bootstrap would scan from the main class's
 * package and fail to resolve the `allowedDependencies` declared in the modules' package-info.java files.
 */
class TafelApplicationModulesFactory : ApplicationModulesFactory {

    override fun of(applicationClass: Class<*>): ApplicationModules {
        return ApplicationModules.of(MODULES_BASE_PACKAGE)
    }

    companion object {
        const val MODULES_BASE_PACKAGE = "at.wrk.tafel.admin.backend.modules"
    }
}
