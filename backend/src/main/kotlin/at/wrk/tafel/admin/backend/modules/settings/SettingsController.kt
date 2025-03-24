package at.wrk.tafel.admin.backend.modules.settings

import at.wrk.tafel.admin.backend.modules.settings.internal.SettingsService
import at.wrk.tafel.admin.backend.modules.settings.model.MailRecipients
import org.springframework.security.access.prepost.PreAuthorize
import org.springframework.web.bind.annotation.GetMapping
import org.springframework.web.bind.annotation.PostMapping
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
    fun getMailRecipientSettings(): MailRecipients {
        return settingsService.getMailRecipients()
    }

    @PostMapping("/mail-recipients")
    fun updateMailRecipientSettings(@RequestBody settings: MailRecipients) {
        settingsService.updateMailRecipients(settings)
    }

}
