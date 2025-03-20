package at.wrk.tafel.admin.backend.modules.settings.internal

import at.wrk.tafel.admin.backend.database.model.base.MailRecipientEntity
import at.wrk.tafel.admin.backend.database.model.base.MailRecipientRepository
import at.wrk.tafel.admin.backend.database.model.base.MailType
import at.wrk.tafel.admin.backend.database.model.base.RecipientType
import at.wrk.tafel.admin.backend.database.model.base.testMailRecipient_DR_BCC1
import at.wrk.tafel.admin.backend.database.model.base.testMailRecipient_DR_BCC2
import at.wrk.tafel.admin.backend.database.model.base.testMailRecipient_DR_CC1
import at.wrk.tafel.admin.backend.database.model.base.testMailRecipient_DR_CC2
import at.wrk.tafel.admin.backend.database.model.base.testMailRecipient_DR_TO1
import at.wrk.tafel.admin.backend.database.model.base.testMailRecipient_DR_TO2
import at.wrk.tafel.admin.backend.modules.settings.model.MailRecipientSetting
import at.wrk.tafel.admin.backend.modules.settings.model.MailRecipientSettings
import io.mockk.every
import io.mockk.impl.annotations.InjectMockKs
import io.mockk.impl.annotations.RelaxedMockK
import io.mockk.junit5.MockKExtension
import io.mockk.slot
import io.mockk.verifyOrder
import org.assertj.core.api.Assertions.assertThat
import org.junit.jupiter.api.Test
import org.junit.jupiter.api.extension.ExtendWith
import at.wrk.tafel.admin.backend.modules.settings.model.MailType as ResponseMailType

@ExtendWith(MockKExtension::class)
class SettingsServiceTest {

    @RelaxedMockK
    private lateinit var mailRecipientRepository: MailRecipientRepository

    @InjectMockKs
    private lateinit var service: SettingsService

    @Test
    fun `fetch mail recipients`() {
        every { mailRecipientRepository.findAll() } returns listOf(
            testMailRecipient_DR_TO1,
            testMailRecipient_DR_TO2,
            testMailRecipient_DR_CC1,
            testMailRecipient_DR_CC2,
            testMailRecipient_DR_BCC1,
            testMailRecipient_DR_BCC2,
        )

        val response = service.getMailRecipients()

        assertThat(response).isEqualTo(
            MailRecipientSettings(
                settings = listOf(
                    MailRecipientSetting(
                        mailType = ResponseMailType(
                            name = "DAILY_REPORT",
                            label = "Tagesreport",
                        ),
                        recipients = mapOf(
                            "To" to listOf(
                                testMailRecipient_DR_TO1.recipient!!,
                                testMailRecipient_DR_TO2.recipient!!,
                            ),
                            "Cc" to listOf(
                                testMailRecipient_DR_CC1.recipient!!,
                                testMailRecipient_DR_CC2.recipient!!,
                            ),
                            "Bcc" to listOf(
                                testMailRecipient_DR_BCC1.recipient!!,
                                testMailRecipient_DR_BCC2.recipient!!,
                            )
                        )
                    )
                )
            )
        )
    }

    @Test
    fun `update mail recipients`() {
        val updatedSettings = MailRecipientSettings(
            settings = listOf(
                MailRecipientSetting(
                    mailType = ResponseMailType(
                        name = "DAILY_REPORT",
                        label = "Tagesreport",
                    ),
                    recipients = mapOf(
                        "To" to listOf("to1", "to2"),
                        "Cc" to listOf("cc1", "cc2"),
                        "Bcc" to listOf("bcc1", "bcc2"),
                    )
                )
            )
        )

        service.updateMailRecipients(updatedSettings)

        val recipientsSlot = slot<List<MailRecipientEntity>>()
        verifyOrder {
            mailRecipientRepository.deleteAll()
            mailRecipientRepository.saveAll(capture(recipientsSlot))
        }

        assertThat(recipientsSlot.captured).containsExactly(
            MailRecipientEntity().apply {
                mailType = MailType.DAILY_REPORT
                recipientType = RecipientType.TO
                recipient = "To"
            },
            MailRecipientEntity().apply {
                mailType = MailType.DAILY_REPORT
                recipientType = RecipientType.TO
                recipient = "To"
            },
            MailRecipientEntity().apply {
                mailType = MailType.DAILY_REPORT
                recipientType = RecipientType.CC
                recipient = "Cc"
            },
            MailRecipientEntity().apply {
                mailType = MailType.DAILY_REPORT
                recipientType = RecipientType.CC
                recipient = "Cc"
            },
            MailRecipientEntity().apply {
                mailType = MailType.DAILY_REPORT
                recipientType = RecipientType.BCC
                recipient = "Bcc"
            },
            MailRecipientEntity().apply {
                mailType = MailType.DAILY_REPORT
                recipientType = RecipientType.BCC
                recipient = "Bcc"
            },
        )
    }

}
