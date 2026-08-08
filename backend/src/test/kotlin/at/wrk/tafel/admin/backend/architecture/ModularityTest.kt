package at.wrk.tafel.admin.backend.architecture

import org.junit.jupiter.api.Test
import org.springframework.modulith.core.ApplicationModules

/**
 * The application's main class lives in `at.wrk.tafel.admin.backend`, but the actual Spring Modulith modules are
 * nested one level deeper under [MODULES_BASE_PACKAGE] (alongside non-module packages like `common`, `config` and
 * `database`), so the verification below has to start from there rather than from the main class's package.
 *
 * IntelliJ's Spring Modulith inspection always bootstraps `ApplicationModules` from the `@SpringBootApplication`
 * class's own package, one level too high. From there it treats `common`, `config`, `database`, `modules` and
 * `security` as the top-level modules instead of the packages under `modules`, so it may flag spurious/missing
 * module-access warnings on the `package-info.java` files under `modules`. This test is the source of truth - if
 * it's green, the module structure is valid regardless of what the IDE inspection shows. See
 * https://github.com/wrk-tafel/admin/issues/2892.
 */
internal class ModularityTest {

    companion object {
        const val MODULES_BASE_PACKAGE = "at.wrk.tafel.admin.backend.modules"
    }

    private val modules = ApplicationModules.of(MODULES_BASE_PACKAGE)

    @Test
    fun verifiesModularStructure() {
        modules.verify()
    }
}
