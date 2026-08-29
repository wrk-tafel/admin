package at.wrk.tafel.admin.backend.modules.support

import at.wrk.tafel.admin.backend.modules.support.internal.ClientErrorLogService
import at.wrk.tafel.admin.backend.modules.support.model.ClientErrorReportRequest
import jakarta.validation.Valid
import org.springframework.http.HttpStatus
import org.springframework.security.access.prepost.PreAuthorize
import org.springframework.web.bind.annotation.PostMapping
import org.springframework.web.bind.annotation.RequestBody
import org.springframework.web.bind.annotation.RequestMapping
import org.springframework.web.bind.annotation.ResponseStatus
import org.springframework.web.bind.annotation.RestController

@RestController
@RequestMapping("/api/client-errors")
@PreAuthorize("isAuthenticated()")
class ClientErrorController(
    private val clientErrorLogService: ClientErrorLogService,
) {

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    fun reportClientError(@Valid @RequestBody request: ClientErrorReportRequest) {
        clientErrorLogService.record(request)
    }
}
