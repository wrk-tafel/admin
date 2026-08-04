package at.wrk.tafel.admin.backend.architecture

import at.wrk.tafel.admin.backend.config.TafelApplicationModulesFactory
import org.junit.jupiter.api.Test
import org.springframework.modulith.core.ApplicationModules

internal class ModularityTest {

    private val modules = ApplicationModules.of(TafelApplicationModulesFactory.MODULES_BASE_PACKAGE)

    /**
     * If IntelliJ's Spring Modulith inspection shows warnings on `package-info.java` files that this test
     * doesn't catch, that's an IDE limitation, not a gap here - see [TafelApplicationModulesFactory].
     */
    @Test
    fun verifiesModularStructure() {
        modules.verify()
    }
}
