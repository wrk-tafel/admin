package at.wrk.tafel.admin.backend.architecture

import org.junit.jupiter.api.Test
import org.springframework.modulith.core.ApplicationModules
import org.springframework.modulith.docs.Documenter
import org.springframework.modulith.docs.Documenter.CanvasOptions
import org.springframework.modulith.docs.Documenter.DiagramOptions

internal class ModularityTest {

    private val modules = ApplicationModules.of("at.wrk.tafel.admin.backend.modules")

    @Test
    fun verifiesModularStructure() {
        modules.verify()
    }

    @Test
    fun createModuleDocumentation() {
        val diagramOptions = DiagramOptions.defaults()
            .withElementsWithoutRelationships(DiagramOptions.ElementsWithoutRelationships.VISIBLE)
        val canvasOptions = CanvasOptions.defaults()
        Documenter(modules).writeDocumentation(diagramOptions, canvasOptions)
    }

}
