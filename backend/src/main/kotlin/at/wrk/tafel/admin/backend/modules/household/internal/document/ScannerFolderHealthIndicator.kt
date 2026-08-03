package at.wrk.tafel.admin.backend.modules.household.internal.document

import at.wrk.tafel.admin.backend.config.properties.TafelAdminProperties
import org.springframework.boot.health.contributor.Health
import org.springframework.boot.health.contributor.HealthIndicator
import org.springframework.stereotype.Component
import java.io.IOException
import java.nio.file.Files
import java.nio.file.Paths

/**
 * Surfaces a dropped scanner-folder NAS/SMB mount via `/actuator/health` (and, through Spring
 * Boot's per-indicator health-status gauge, `/actuator/prometheus`) instead of it silently looking
 * like "no documents today" - see issue #2933. This is a separate, direct check rather than reusing
 * [ScannerFileService.listFiles], which deliberately treats a missing directory as "feature
 * disabled" (see its own docs) and would otherwise mask exactly the failure this is meant to catch.
 */
@Component
class ScannerFolderHealthIndicator(
    private val tafelAdminProperties: TafelAdminProperties,
) : HealthIndicator {

    override fun health(): Health {
        val scannerPath = tafelAdminProperties.storage.scannerPath
            ?: return Health.up().withDetail("configured", false).build()

        val scannerDir = Paths.get(scannerPath)
        return try {
            if (!Files.isDirectory(scannerDir)) {
                Health.down()
                    .withDetail("configured", true)
                    .withDetail("path", scannerPath)
                    .withDetail("reason", "not a directory - mount likely not present")
                    .build()
            } else {
                val fileCount = Files.list(scannerDir).use { it.count() }
                Health.up()
                    .withDetail("configured", true)
                    .withDetail("path", scannerPath)
                    .withDetail("fileCount", fileCount)
                    .build()
            }
        } catch (e: IOException) {
            Health.down(e)
                .withDetail("configured", true)
                .withDetail("path", scannerPath)
                .build()
        }
    }
}
