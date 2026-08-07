package at.wrk.tafel.admin.backend.modules.config

import at.wrk.tafel.admin.backend.config.properties.TafelAdminProperties
import org.springframework.security.access.prepost.PreAuthorize
import org.springframework.web.bind.annotation.GetMapping
import org.springframework.web.bind.annotation.RequestMapping
import org.springframework.web.bind.annotation.RestController

@RestController
@RequestMapping("/api/config")
@PreAuthorize("isAuthenticated()")
class ConfigController(
    private val tafelAdminProperties: TafelAdminProperties,
) {

    @GetMapping
    fun getConfig(): ConfigResponse = ConfigResponse(
        version = tafelAdminProperties.version,
        buildTime = tafelAdminProperties.buildTime,
        scannerFolderEnabled = tafelAdminProperties.storage.scannerFolderAvailable,
    )
}
