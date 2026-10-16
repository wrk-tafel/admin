package at.wrk.tafel.admin.backend.common.auth

import at.wrk.tafel.admin.backend.common.api.TafelPublicEndpoint
import at.wrk.tafel.admin.backend.common.auth.components.EmailChangeService
import at.wrk.tafel.admin.backend.common.auth.components.InvalidEmailChangeLinkException
import at.wrk.tafel.admin.backend.common.auth.model.EmailChangeConfirmRequest
import at.wrk.tafel.admin.backend.common.auth.model.EmailChangeConfirmResponse
import jakarta.validation.Valid
import org.springframework.http.HttpStatus
import org.springframework.http.ResponseEntity
import org.springframework.web.bind.annotation.PostMapping
import org.springframework.web.bind.annotation.RequestBody
import org.springframework.web.bind.annotation.RequestMapping
import org.springframework.web.bind.annotation.RestController

/**
 * Confirms a change of the own e-mail address through the link mailed to the previous address - see
 * [EmailChangeService] and ADR-0072. Reached without a session: the mailbox is the proof, and the link
 * may well be opened on another device than the one the change was made on.
 */
@RestController
@RequestMapping("/api/email-change")
class EmailChangeController(
    private val emailChangeService: EmailChangeService,
) {

    @PostMapping("/confirm")
    @TafelPublicEndpoint
    fun confirm(@Valid @RequestBody request: EmailChangeConfirmRequest): ResponseEntity<EmailChangeConfirmResponse> = try {
        emailChangeService.confirm(request.token)
        ResponseEntity.noContent().build()
    } catch (e: InvalidEmailChangeLinkException) {
        ResponseEntity.status(HttpStatus.GONE).body(EmailChangeConfirmResponse(message = e.message!!))
    }
}
