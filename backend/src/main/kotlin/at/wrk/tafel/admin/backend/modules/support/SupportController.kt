package at.wrk.tafel.admin.backend.modules.support

import at.wrk.tafel.admin.backend.modules.support.internal.SupportService
import at.wrk.tafel.admin.backend.modules.support.model.SupportRequest
import jakarta.validation.Valid
import org.springframework.http.HttpStatus
import org.springframework.security.access.prepost.PreAuthorize
import org.springframework.web.bind.annotation.PostMapping
import org.springframework.web.bind.annotation.RequestBody
import org.springframework.web.bind.annotation.RequestMapping
import org.springframework.web.bind.annotation.ResponseStatus
import org.springframework.web.bind.annotation.RestController

@RestController
@RequestMapping("/api/support")
@PreAuthorize("isAuthenticated()")
class SupportController(
    private val supportService: SupportService,
) {

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    fun createSupportRequest(@Valid @RequestBody request: SupportRequest) {
        supportService.sendSupportRequest(request)
    }
}
