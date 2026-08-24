package at.wrk.tafel.admin.backend.modules.settings

import at.wrk.tafel.admin.backend.modules.settings.internal.SettingsService
import at.wrk.tafel.admin.backend.modules.settings.model.MailRecipientsRequest
import at.wrk.tafel.admin.backend.modules.settings.model.MailRecipientsResponse
import at.wrk.tafel.admin.backend.modules.settings.model.StaticValueListResponse
import at.wrk.tafel.admin.backend.modules.settings.model.StaticValueRequest
import at.wrk.tafel.admin.backend.modules.settings.model.StaticValueResponse
import jakarta.validation.Valid
import org.springframework.http.ResponseEntity
import org.springframework.security.access.prepost.PreAuthorize
import org.springframework.web.bind.annotation.DeleteMapping
import org.springframework.web.bind.annotation.GetMapping
import org.springframework.web.bind.annotation.PathVariable
import org.springframework.web.bind.annotation.PutMapping
import org.springframework.web.bind.annotation.RequestBody
import org.springframework.web.bind.annotation.RequestMapping
import org.springframework.web.bind.annotation.RestController

@RestController
@RequestMapping("/api/settings")
@PreAuthorize("hasAuthority('SETTINGS')")
class SettingsController(
    private val settingsService: SettingsService,
) {

    @GetMapping("/mail-recipients")
    fun getMailRecipientSettings(): MailRecipientsResponse = settingsService.getMailRecipients()

    @PutMapping("/mail-recipients")
    fun updateMailRecipientSettings(@Valid @RequestBody settings: MailRecipientsRequest): MailRecipientsResponse = settingsService.updateMailRecipients(settings)

    @DeleteMapping("/mail-recipients/{id}")
    fun deleteMailRecipientSetting(@PathVariable id: Long): ResponseEntity<Unit> {
        settingsService.deleteMailRecipient(id)
        return ResponseEntity.noContent().build()
    }

    @GetMapping("/static-values")
    fun getStaticValues(): StaticValueListResponse = settingsService.getStaticValues()

    @PutMapping("/static-values/{staticValueId}")
    fun updateStaticValue(
        @PathVariable staticValueId: Long,
        @Valid @RequestBody staticValue: StaticValueRequest,
    ): StaticValueResponse = settingsService.updateStaticValue(staticValueId, staticValue)
}
