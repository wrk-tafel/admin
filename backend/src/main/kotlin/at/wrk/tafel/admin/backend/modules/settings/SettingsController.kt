package at.wrk.tafel.admin.backend.modules.settings

import at.wrk.tafel.admin.backend.modules.settings.internal.SettingsService
import at.wrk.tafel.admin.backend.modules.settings.model.MailRecipients
import at.wrk.tafel.admin.backend.modules.settings.model.StaticValueItem
import at.wrk.tafel.admin.backend.modules.settings.model.StaticValueListResponse
import org.springframework.security.access.prepost.PreAuthorize
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
    fun getMailRecipientSettings(): MailRecipients = settingsService.getMailRecipients()

    @PutMapping("/mail-recipients")
    fun updateMailRecipientSettings(@RequestBody settings: MailRecipients) {
        settingsService.updateMailRecipients(settings)
    }

    @GetMapping("/static-values")
    fun getStaticValues(): StaticValueListResponse = settingsService.getStaticValues()

    @PutMapping("/static-values/{staticValueId}")
    fun updateStaticValue(
        @PathVariable staticValueId: Long,
        @RequestBody staticValue: StaticValueItem,
    ): StaticValueItem = settingsService.updateStaticValue(staticValueId, staticValue)
}
