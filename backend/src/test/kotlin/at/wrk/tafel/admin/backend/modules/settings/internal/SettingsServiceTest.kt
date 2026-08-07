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
import at.wrk.tafel.admin.backend.database.model.staticdata.StaticValueEntity
import at.wrk.tafel.admin.backend.database.model.staticdata.StaticValueRepository
import at.wrk.tafel.admin.backend.database.model.staticdata.StaticValueType
import at.wrk.tafel.admin.backend.modules.base.exception.NotFoundException
import at.wrk.tafel.admin.backend.modules.settings.model.MailRecipientAdresses
import at.wrk.tafel.admin.backend.modules.settings.model.MailRecipientType
import at.wrk.tafel.admin.backend.modules.settings.model.MailRecipientsPerMailType
import at.wrk.tafel.admin.backend.modules.settings.model.MailRecipientsRequest
import at.wrk.tafel.admin.backend.modules.settings.model.MailRecipientsResponse
import at.wrk.tafel.admin.backend.modules.settings.model.StaticValueRequest
import at.wrk.tafel.admin.backend.modules.settings.model.StaticValueResponse
import io.mockk.every
import io.mockk.impl.annotations.InjectMockKs
import io.mockk.impl.annotations.RelaxedMockK
import io.mockk.junit5.MockKExtension
import io.mockk.slot
import io.mockk.verify
import io.mockk.verifyOrder
import org.assertj.core.api.Assertions.assertThat
import org.assertj.core.api.Assertions.assertThatThrownBy
import org.junit.jupiter.api.Test
import org.junit.jupiter.api.extension.ExtendWith
import org.springframework.data.repository.findByIdOrNull
import java.math.BigDecimal
import java.time.LocalDate

@ExtendWith(MockKExtension::class)
class SettingsServiceTest {

    @RelaxedMockK
    private lateinit var mailRecipientRepository: MailRecipientRepository

    @RelaxedMockK
    private lateinit var staticValueRepository: StaticValueRepository

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
            MailRecipientsResponse(
                mailRecipients = listOf(
                    MailRecipientsPerMailType(
                        mailType = MailType.DAILY_REPORT.name,
                        recipients = listOf(
                            MailRecipientAdresses(
                                recipientType = MailRecipientType.TO,
                                addresses = listOf(
                                    testMailRecipient_DR_TO1.address!!,
                                    testMailRecipient_DR_TO2.address!!,
                                ),
                            ),
                            MailRecipientAdresses(
                                recipientType = MailRecipientType.CC,
                                addresses = listOf(
                                    testMailRecipient_DR_CC1.address!!,
                                    testMailRecipient_DR_CC2.address!!,
                                ),
                            ),
                            MailRecipientAdresses(
                                recipientType = MailRecipientType.BCC,
                                addresses = listOf(
                                    testMailRecipient_DR_BCC1.address!!,
                                    testMailRecipient_DR_BCC2.address!!,
                                ),
                            ),
                        ),
                    ),
                ),
            ),
        )
    }

    @Test
    fun `update mail recipients`() {
        val updatedSettings = MailRecipientsRequest(
            mailRecipients = listOf(
                MailRecipientsPerMailType(
                    mailType = MailType.DAILY_REPORT.name,
                    recipients = listOf(
                        MailRecipientAdresses(
                            recipientType = MailRecipientType.TO,
                            addresses = listOf("to1", "to2"),
                        ),
                        MailRecipientAdresses(
                            recipientType = MailRecipientType.CC,
                            addresses = listOf("cc1", "cc2"),
                        ),
                        MailRecipientAdresses(
                            recipientType = MailRecipientType.BCC,
                            addresses = listOf("bcc1", "bcc2"),
                        ),
                    ),
                ),
            ),
        )

        service.updateMailRecipients(updatedSettings)

        val recipientsSlot = slot<List<MailRecipientEntity>>()
        verifyOrder {
            mailRecipientRepository.deleteAll()
            mailRecipientRepository.saveAll(capture(recipientsSlot))
        }

        assertThat(recipientsSlot.captured).containsExactly(
            MailRecipientEntity(mailType = MailType.DAILY_REPORT, recipientType = RecipientType.TO, address = "TO"),
            MailRecipientEntity(mailType = MailType.DAILY_REPORT, recipientType = RecipientType.TO, address = "TO"),
            MailRecipientEntity(mailType = MailType.DAILY_REPORT, recipientType = RecipientType.CC, address = "CC"),
            MailRecipientEntity(mailType = MailType.DAILY_REPORT, recipientType = RecipientType.CC, address = "CC"),
            MailRecipientEntity(mailType = MailType.DAILY_REPORT, recipientType = RecipientType.BCC, address = "BCC"),
            MailRecipientEntity(mailType = MailType.DAILY_REPORT, recipientType = RecipientType.BCC, address = "BCC"),
        )
    }

    @Test
    fun `update, filter and sanitize mail recipients`() {
        val updatedSettings = MailRecipientsRequest(
            mailRecipients = listOf(
                MailRecipientsPerMailType(
                    mailType = MailType.DAILY_REPORT.name,
                    recipients = listOf(
                        MailRecipientAdresses(
                            recipientType = MailRecipientType.TO,
                            addresses = listOf("     "),
                        ),
                        MailRecipientAdresses(
                            recipientType = MailRecipientType.CC,
                            addresses = listOf("      c  c1         "),
                        ),
                    ),
                ),
            ),
        )

        service.updateMailRecipients(updatedSettings)

        val recipientsSlot = slot<List<MailRecipientEntity>>()
        verifyOrder {
            mailRecipientRepository.deleteAll()
            mailRecipientRepository.saveAll(capture(recipientsSlot))
        }

        assertThat(recipientsSlot.captured).containsExactly(
            MailRecipientEntity(mailType = MailType.DAILY_REPORT, recipientType = RecipientType.CC, address = "c c1"),
        )
    }

    @Test
    fun `fetch static values only returns rows currently valid today`() {
        val today = LocalDate.now()

        val current = StaticValueEntity(
            validFrom = today.minusDays(10),
            validTo = LocalDate.of(2999, 12, 31),
            type = StaticValueType.TOLERANCE,
            amount = BigDecimal("100.00"),
        ).apply { id = 1 }
        val expired = StaticValueEntity(
            validFrom = LocalDate.of(1900, 1, 1),
            validTo = today.minusDays(11),
            type = StaticValueType.TOLERANCE,
            amount = BigDecimal("50.00"),
        ).apply { id = 2 }
        val notYetValid = StaticValueEntity(
            validFrom = today.plusDays(1),
            validTo = LocalDate.of(2999, 12, 31),
            type = StaticValueType.INCOME_LIMIT,
            amount = BigDecimal("1328.00"),
        ).apply {
            id = 3
            countAdults = 1
            countChildren = 0
        }
        every { staticValueRepository.findAll() } returns listOf(current, expired, notYetValid)

        val response = service.getStaticValues()

        assertThat(response.staticValues).containsExactly(
            StaticValueResponse(
                id = 1,
                type = "TOLERANCE",
                validFrom = today.minusDays(10),
                validTo = LocalDate.of(2999, 12, 31),
                amount = BigDecimal("100.00"),
                countAdults = null,
                countChildren = null,
                age = null,
            ),
        )
    }

    @Test
    fun `update static value historizes - closes the current row yesterday and opens a new one today`() {
        val today = LocalDate.now()
        val existing = StaticValueEntity(
            validFrom = LocalDate.of(2022, 1, 1),
            validTo = LocalDate.of(2999, 12, 31),
            type = StaticValueType.INCOME_LIMIT,
            amount = BigDecimal("1328.00"),
        ).apply {
            id = 1
            countAdults = 1
            countChildren = 0
        }
        every { staticValueRepository.findByIdOrNull(1L) } returns existing
        val savedEntitySlot = slot<StaticValueEntity>()
        every { staticValueRepository.save(capture(savedEntitySlot)) } answers {
            savedEntitySlot.captured.apply { if (id == null) id = 2L }
        }

        // type/countAdults/countChildren/age differ from the existing row, but must be ignored - only
        // amount is editable, so the new historized row keeps the existing row's own values
        val requestedChanges = StaticValueRequest(
            id = 1,
            type = "TOLERANCE",
            validFrom = LocalDate.of(2030, 1, 1),
            validTo = LocalDate.of(2031, 1, 1),
            amount = BigDecimal("1500.00"),
            countAdults = 9,
            countChildren = 9,
            age = 99,
        )

        val response = service.updateStaticValue(1L, requestedChanges)

        assertThat(existing.validTo).isEqualTo(today.minusDays(1))
        assertThat(response).isEqualTo(
            StaticValueResponse(
                id = 2,
                type = "INCOME_LIMIT",
                validFrom = today,
                validTo = LocalDate.of(2999, 12, 31),
                amount = BigDecimal("1500.00"),
                countAdults = 1,
                countChildren = 0,
                age = null,
            ),
        )
    }

    @Test
    fun `update static value updates in place when the currently valid row already started today`() {
        val today = LocalDate.now()
        val existing = StaticValueEntity(
            validFrom = today,
            validTo = LocalDate.of(2999, 12, 31),
            type = StaticValueType.TOLERANCE,
            amount = BigDecimal("100.00"),
        ).apply { id = 1 }
        every { staticValueRepository.findByIdOrNull(1L) } returns existing
        every { staticValueRepository.save(any()) } answers { firstArg() }

        val requestedChanges = StaticValueRequest(
            id = 1,
            type = "TOLERANCE",
            validFrom = today,
            validTo = LocalDate.of(2999, 12, 31),
            amount = BigDecimal("999.00"),
            countAdults = null,
            countChildren = null,
            age = null,
        )

        val response = service.updateStaticValue(1L, requestedChanges)

        verify(exactly = 1) { staticValueRepository.save(any()) }
        assertThat(response).isEqualTo(
            StaticValueResponse(
                id = 1,
                type = "TOLERANCE",
                validFrom = today,
                validTo = LocalDate.of(2999, 12, 31),
                amount = BigDecimal("999.00"),
                countAdults = null,
                countChildren = null,
                age = null,
            ),
        )
    }

    @Test
    fun `update static value fails when id is not found`() {
        every { staticValueRepository.findByIdOrNull(99L) } returns null

        val updated = StaticValueRequest(
            id = 99,
            type = "TOLERANCE",
            validFrom = LocalDate.of(2026, 1, 1),
            validTo = LocalDate.of(2999, 12, 31),
            amount = BigDecimal("150.00"),
            countAdults = null,
            countChildren = null,
            age = null,
        )

        assertThatThrownBy { service.updateStaticValue(99L, updated) }
            .isInstanceOf(NotFoundException::class.java)
    }
}
