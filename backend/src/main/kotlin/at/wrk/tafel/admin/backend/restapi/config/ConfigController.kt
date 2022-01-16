package at.wrk.tafel.admin.backend.restapi.config

import org.springframework.web.bind.annotation.GetMapping
import org.springframework.web.bind.annotation.RestController
import javax.servlet.http.HttpServletRequest

@RestController
class ConfigController {

    @GetMapping("/config.json")
    fun getConfig(request: HttpServletRequest): ConfigResponse {
        val baseUrl = request.requestURL.dropLast(request.servletPath.length)
        return ConfigResponse(baseUrl = "$baseUrl/api")
    }

}
