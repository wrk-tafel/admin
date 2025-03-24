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
import at.wrk.tafel.admin.backend.modules.settings.model.MailRecipientAdresses
import at.wrk.tafel.admin.backend.modules.settings.model.MailRecipientType
import at.wrk.tafel.admin.backend.modules.settings.model.MailRecipients
import at.wrk.tafel.admin.backend.modules.settings.model.MailRecipientsPerMailType
import io.mockk.every
import io.mockk.impl.annotations.InjectMockKs
import io.mockk.impl.annotations.RelaxedMockK
import io.mockk.junit5.MockKExtension
import io.mockk.slot
import io.mockk.verifyOrder
import org.assertj.core.api.Assertions.assertThat
import org.junit.jupiter.api.Test
import org.junit.jupiter.api.extension.ExtendWith

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
            MailRecipients(
                mailRecipients = listOf(
                    MailRecipientsPerMailType(
                        mailType = MailType.DAILY_REPORT.name,
                        recipients = listOf(
                            MailRecipientAdresses(
                                recipientType = MailRecipientType.TO,
                                addresses = listOf(
                                    testMailRecipient_DR_TO1.address!!,
                                    testMailRecipient_DR_TO2.address!!
                                )
                            ),
                            MailRecipientAdresses(
                                recipientType = MailRecipientType.CC,
                                addresses = listOf(
                                    testMailRecipient_DR_CC1.address!!,
                                    testMailRecipient_DR_CC2.address!!
                                )
                            ),
                            MailRecipientAdresses(
                                recipientType = MailRecipientType.BCC,
                                addresses = listOf(
                                    testMailRecipient_DR_BCC1.address!!,
                                    testMailRecipient_DR_BCC2.address!!
                                )
                            )
                        )
                    )
                )
            )
        )
    }

    @Test
    fun `update mail recipients`() {
        val updatedSettings = MailRecipients(
            mailRecipients = listOf(
                MailRecipientsPerMailType(
                    mailType = MailType.DAILY_REPORT.name,
                    recipients = listOf(
                        MailRecipientAdresses(
                            recipientType = MailRecipientType.TO,
                            addresses = listOf("to1", "to2")
                        ),
                        MailRecipientAdresses(
                            recipientType = MailRecipientType.CC,
                            addresses = listOf("cc1", "cc2")
                        ),
                        MailRecipientAdresses(
                            recipientType = MailRecipientType.BCC,
                            addresses = listOf("bcc1", "bcc2")
                        )
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
                address = "TO"
            },
            MailRecipientEntity().apply {
                mailType = MailType.DAILY_REPORT
                recipientType = RecipientType.TO
                address = "TO"
            },
            MailRecipientEntity().apply {
                mailType = MailType.DAILY_REPORT
                recipientType = RecipientType.CC
                address = "CC"
            },
            MailRecipientEntity().apply {
                mailType = MailType.DAILY_REPORT
                recipientType = RecipientType.CC
                address = "CC"
            },
            MailRecipientEntity().apply {
                mailType = MailType.DAILY_REPORT
                recipientType = RecipientType.BCC
                address = "BCC"
            },
            MailRecipientEntity().apply {
                mailType = MailType.DAILY_REPORT
                recipientType = RecipientType.BCC
                address = "BCC"
            },
        )
    }

    @Test
    fun `update, filter and sanitize mail recipients`() {
        val updatedSettings = MailRecipients(
            mailRecipients = listOf(
                MailRecipientsPerMailType(
                    mailType = MailType.DAILY_REPORT.name,
                    recipients = listOf(
                        MailRecipientAdresses(
                            recipientType = MailRecipientType.TO,
                            addresses = listOf("     ")
                        ),
                        MailRecipientAdresses(
                            recipientType = MailRecipientType.CC,
                            addresses = listOf("      c  c1         ")
                        )
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
                recipientType = RecipientType.CC
                address = "c c1"
            }
        )
    }

}
