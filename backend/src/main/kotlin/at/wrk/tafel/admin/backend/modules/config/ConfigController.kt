package at.wrk.tafel.admin.backend.modules.config

import at.wrk.tafel.admin.backend.config.properties.TafelAdminProperties
import org.springframework.security.access.prepost.PreAuthorize
import org.springframework.web.bind.annotation.GetMapping
import org.springframework.web.bind.annotation.RequestMapping
import org.springframework.web.bind.annotation.RestController

/**
 * The injected properties are re-bound in place when an operator edits the mounted config file (see
 * `ConfigFileReloadService`), so reading them per request is what makes this endpoint answer with
 * the new values without a restart. Sessions that are already open don't have to wait for their
 * next request - `ConfigSseController` pushes the same change to them.
 */
@RestController
@RequestMapping("/api/config")
class ConfigController(
    private val tafelAdminProperties: TafelAdminProperties,
) {

    @GetMapping
    @PreAuthorize("isAuthenticated()")
    fun getConfig(): ConfigResponse = tafelAdminProperties.toConfigResponse()

    /**
     * The environment label alone, for the login page - the one screen that has to show a
     * deployment fact before anyone has logged in (see #3032). Everything else this module serves
     * stays behind [getConfig]'s `isAuthenticated()`: which release is running and which optional
     * features exist are details an anonymous caller has no business reading.
     *
     * A separate endpoint rather than [getConfig] answering with less to an anonymous caller,
     * because `TafelJwtAuthConverter` rejects any request under `/api` that carries no JWT cookie
     * before a controller is reached - one endpoint serving both audiences would mean changing the
     * authentication filter chain itself, which is a far bigger change than a login-page badge
     * warrants. Its path is therefore listed in `WebSecurityConfig.publicEndpoints`.
     */
    @GetMapping("/public")
    fun getPublicConfig(): PublicConfigResponse = PublicConfigResponse(
        environmentLabel = tafelAdminProperties.environmentLabel.trim(),
    )
}
