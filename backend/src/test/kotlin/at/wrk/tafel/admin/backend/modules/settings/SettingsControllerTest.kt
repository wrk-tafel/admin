package at.wrk.tafel.admin.backend.modules.settings

import at.wrk.tafel.admin.backend.modules.settings.internal.SettingsService
import at.wrk.tafel.admin.backend.modules.settings.model.MailRecipientsRequest
import at.wrk.tafel.admin.backend.modules.settings.model.MailRecipientsResponse
import at.wrk.tafel.admin.backend.modules.settings.model.StaticValueRequest
import at.wrk.tafel.admin.backend.modules.settings.model.StaticValueResponse
import io.mockk.every
import io.mockk.impl.annotations.InjectMockKs
import io.mockk.impl.annotations.RelaxedMockK
import io.mockk.junit5.MockKExtension
import io.mockk.verify
import org.assertj.core.api.Assertions.assertThat
import org.junit.jupiter.api.Test
import org.junit.jupiter.api.extension.ExtendWith
import java.math.BigDecimal
import java.time.LocalDate

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
        val settings = MailRecipientsRequest(emptyList())
        val updatedSettings = MailRecipientsResponse(emptyList())
        every { settingsService.updateMailRecipients(settings) } returns updatedSettings

        val response = settingsController.updateMailRecipientSettings(settings)

        assertThat(response).isEqualTo(updatedSettings)
        verify(exactly = 1) { settingsService.updateMailRecipients(settings) }
    }

    @Test
    fun `delete mail recipient setting`() {
        val response = settingsController.deleteMailRecipientSetting(42L)

        assertThat(response.statusCode.value()).isEqualTo(204)
        verify(exactly = 1) { settingsService.deleteMailRecipient(42L) }
    }

    @Test
    fun `get static values`() {
        settingsController.getStaticValues()

        verify(exactly = 1) { settingsService.getStaticValues() }
    }

    @Test
    fun `update static value`() {
        val staticValueRequest = StaticValueRequest(
            id = 42L,
            type = "TOLERANCE",
            validFrom = LocalDate.of(2026, 1, 1),
            validTo = LocalDate.of(2999, 12, 31),
            amount = BigDecimal("150.00"),
            countAdults = null,
            countChildren = null,
            age = null,
        )
        val staticValueResponse = StaticValueResponse(
            id = staticValueRequest.id,
            type = staticValueRequest.type,
            validFrom = staticValueRequest.validFrom,
            validTo = staticValueRequest.validTo,
            amount = staticValueRequest.amount,
            countAdults = staticValueRequest.countAdults,
            countChildren = staticValueRequest.countChildren,
            age = staticValueRequest.age,
        )
        every { settingsService.updateStaticValue(any(), any()) } returns staticValueResponse

        val response = settingsController.updateStaticValue(42L, staticValueRequest)

        assertThat(response).isEqualTo(staticValueResponse)
        verify(exactly = 1) { settingsService.updateStaticValue(42L, staticValueRequest) }
    }
}
