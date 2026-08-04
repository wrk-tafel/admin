package at.wrk.tafel.admin.backend.config

import org.springframework.modulith.core.ApplicationModules
import org.springframework.modulith.core.ApplicationModulesFactory

/**
 * The application's main class lives in [at.wrk.tafel.admin.backend], but the actual Spring Modulith modules are
 * nested one level deeper under [at.wrk.tafel.admin.backend.modules] (alongside non-module packages like `common`,
 * `config` and `database`). Without this, Spring Modulith's runtime bootstrap would scan from the main class's
 * package and fail to resolve the `allowedDependencies` declared in the modules' package-info.java files.
 *
 * IntelliJ's Spring Modulith inspection does not know about this custom factory: it always bootstraps
 * `ApplicationModules` from the `@SpringBootApplication` class's own package
 * ([at.wrk.tafel.admin.backend]), one level too high. From there it treats `common`, `config`, `database`,
 * `modules` and `security` as the top-level modules instead of the packages under `modules`, so it may flag
 * spurious/missing module-access warnings on the `package-info.java` files under `modules`. `ModularityTest`
 * uses [MODULES_BASE_PACKAGE] directly and is the source of truth - if it's green, the module structure is
 * valid regardless of what the IDE inspection shows. See https://github.com/wrk-tafel/admin/issues/2892.
 */
class TafelApplicationModulesFactory : ApplicationModulesFactory {

    override fun of(applicationClass: Class<*>): ApplicationModules = ApplicationModules.of(MODULES_BASE_PACKAGE)

    companion object {
        const val MODULES_BASE_PACKAGE = "at.wrk.tafel.admin.backend.modules"
    }
}
