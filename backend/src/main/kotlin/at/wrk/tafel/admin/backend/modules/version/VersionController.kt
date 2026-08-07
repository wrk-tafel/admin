package at.wrk.tafel.admin.backend.modules.version

import at.wrk.tafel.admin.backend.config.properties.TafelAdminProperties
import org.springframework.security.access.prepost.PreAuthorize
import org.springframework.web.bind.annotation.GetMapping
import org.springframework.web.bind.annotation.RequestMapping
import org.springframework.web.bind.annotation.RestController

@RestController
@RequestMapping("/api/version")
@PreAuthorize("isAuthenticated()")
class VersionController(
    private val tafelAdminProperties: TafelAdminProperties,
) {

    @GetMapping
    fun getVersion(): VersionResponse = VersionResponse(
        version = tafelAdminProperties.version,
        buildTime = tafelAdminProperties.buildTime,
    )
}
