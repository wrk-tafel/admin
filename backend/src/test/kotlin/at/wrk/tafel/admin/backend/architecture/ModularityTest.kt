package at.wrk.tafel.admin.backend.architecture

import at.wrk.tafel.admin.backend.config.TafelApplicationModulesFactory
import net.sourceforge.plantuml.FileFormat
import net.sourceforge.plantuml.FileFormatOption
import net.sourceforge.plantuml.SourceStringReader
import org.junit.jupiter.api.Test
import org.springframework.modulith.core.ApplicationModules
import org.springframework.modulith.docs.Documenter
import org.springframework.modulith.docs.Documenter.CanvasOptions
import org.springframework.modulith.docs.Documenter.DiagramOptions
import java.io.File

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

    /**
     * Regenerates the module overview diagram embedded in the repo root README.md (see "Module Structure").
     * Runs on every test execution so the diagram can never drift from the actual module structure; CI opens
     * a PR with the updated SVG whenever a push to main changes it (see main_push.yml).
     */
    @Test
    fun createModuleDocumentation() {
        val outputFolder = repoRoot().resolve("backend/build/spring-modulith-docs")

        val diagramOptions = DiagramOptions.defaults()
            .withElementsWithoutRelationships(DiagramOptions.ElementsWithoutRelationships.VISIBLE)
        val canvasOptions = CanvasOptions.defaults()
        Documenter(modules, Documenter.Options.defaults().withOutputFolder(outputFolder.path))
            .writeDocumentation(diagramOptions, canvasOptions)

        val componentsPuml = outputFolder.resolve("components.puml").readText()
        val outputSvg = repoRoot().resolve("docs/module-structure.svg")
        outputSvg.parentFile.mkdirs()
        outputSvg.outputStream().use { out ->
            SourceStringReader(componentsPuml).outputImage(out, FileFormatOption(FileFormat.SVG, false))
        }
    }

    private tailrec fun repoRoot(dir: File = File(".").absoluteFile): File {
        val marker = File(dir, "settings.gradle.kts")
        check(dir.parentFile != null) { "Could not locate repository root (no settings.gradle.kts found)" }
        return if (marker.exists()) dir else repoRoot(dir.parentFile)
    }
}
