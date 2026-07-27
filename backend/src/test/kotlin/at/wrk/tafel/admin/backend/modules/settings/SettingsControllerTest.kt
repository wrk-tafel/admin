package at.wrk.tafel.admin.backend.modules.settings

import at.wrk.tafel.admin.backend.modules.settings.internal.SettingsService
import at.wrk.tafel.admin.backend.modules.settings.model.MailRecipients
import at.wrk.tafel.admin.backend.modules.settings.model.StaticValueItem
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
        val settings = MailRecipients(emptyList())
        settingsController.updateMailRecipientSettings(settings)

        verify(exactly = 1) { settingsService.updateMailRecipients(settings) }
    }

    @Test
    fun `get static values`() {
        settingsController.getStaticValues()

        verify(exactly = 1) { settingsService.getStaticValues() }
    }

    @Test
    fun `create static value`() {
        val staticValue = StaticValueItem(
            id = null,
            type = "TOLERANCE",
            validFrom = LocalDate.of(2026, 1, 1),
            validTo = LocalDate.of(2999, 12, 31),
            amount = BigDecimal("100.00"),
            countAdults = null,
            countChildren = null,
            age = null,
        )
        val createdStaticValue = staticValue.copy(id = 42L)
        every { settingsService.createStaticValue(any()) } returns createdStaticValue

        val response = settingsController.createStaticValue(staticValue)

        assertThat(response).isEqualTo(createdStaticValue)
        verify(exactly = 1) { settingsService.createStaticValue(staticValue) }
    }

    @Test
    fun `update static value`() {
        val staticValue = StaticValueItem(
            id = 42L,
            type = "TOLERANCE",
            validFrom = LocalDate.of(2026, 1, 1),
            validTo = LocalDate.of(2999, 12, 31),
            amount = BigDecimal("150.00"),
            countAdults = null,
            countChildren = null,
            age = null,
        )
        every { settingsService.updateStaticValue(any(), any()) } returns staticValue

        val response = settingsController.updateStaticValue(42L, staticValue)

        assertThat(response).isEqualTo(staticValue)
        verify(exactly = 1) { settingsService.updateStaticValue(42L, staticValue) }
    }

}
