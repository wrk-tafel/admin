package at.wrk.tafel.admin.backend.restapi.config

import at.wrk.tafel.admin.backend.config.TafelAdminProperties
import org.springframework.web.bind.annotation.GetMapping
import org.springframework.web.bind.annotation.RestController
import javax.servlet.http.HttpServletRequest

@RestController
class ConfigController(
    private val tafelAdminProperties: TafelAdminProperties
) {

    @GetMapping("/config.json")
    fun getConfig(request: HttpServletRequest): ConfigResponse {
        return ConfigResponse(apiBaseUrl = "${tafelAdminProperties.baseUrl}/api")
    }

}
