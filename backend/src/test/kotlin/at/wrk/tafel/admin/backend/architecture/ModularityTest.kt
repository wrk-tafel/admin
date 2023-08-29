package at.wrk.tafel.admin.backend.architecture

import org.junit.jupiter.api.Test
import org.springframework.modulith.core.ApplicationModules
import org.springframework.modulith.docs.Documenter

internal class ModularityTest {

    private val modules = ApplicationModules.of("at.wrk.tafel.admin.backend.modules")

    @Test
    fun verifiesModularStructure() {
        modules.verify()
    }

    @Test
    fun createModuleDocumentation() {
        Documenter(modules).writeDocumentation()
    }

}
