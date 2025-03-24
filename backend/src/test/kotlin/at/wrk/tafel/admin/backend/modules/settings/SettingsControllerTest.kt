package at.wrk.tafel.admin.backend.modules.settings

import at.wrk.tafel.admin.backend.modules.settings.internal.SettingsService
import at.wrk.tafel.admin.backend.modules.settings.model.MailRecipients
import io.mockk.impl.annotations.InjectMockKs
import io.mockk.impl.annotations.RelaxedMockK
import io.mockk.junit5.MockKExtension
import io.mockk.verify
import org.junit.jupiter.api.Test
import org.junit.jupiter.api.extension.ExtendWith

@ExtendWith(MockKExtension::class)
class SettingsControllerTest {

    @RelaxedMockK
    private lateinit var settingsService: SettingsService

    @InjectMockKs
    private lateinit var settingsController: SettingsController

    @Test
    fun `get mail recipient settings`() {
        settingsController.getMailRecipientSettings()

        verify(exactly = 1) { settingsService.getMailRecipients() }
    }

    @Test
    fun `update mail recipient settings`() {
        val settings = MailRecipients(emptyList())
        settingsController.updateMailRecipientSettings(settings)

        verify(exactly = 1) { settingsService.updateMailRecipients(settings) }
    }

}
