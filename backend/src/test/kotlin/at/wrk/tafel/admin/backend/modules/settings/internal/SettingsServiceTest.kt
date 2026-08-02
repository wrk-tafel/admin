package at.wrk.tafel.admin.backend.modules.settings.internal

import at.wrk.tafel.admin.backend.common.auth.components.LoginAttemptService
import at.wrk.tafel.admin.backend.database.model.auth.LoginAttemptEntity
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
import at.wrk.tafel.admin.backend.modules.settings.model.LoginAttemptItem
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

    @RelaxedMockK
    private lateinit var loginAttemptService: LoginAttemptService

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
            MailRecipientEntity().apply {
                mailType = MailType.DAILY_REPORT
                recipientType = RecipientType.CC
                address = "c c1"
            },
        )
    }

    @Test
    fun `fetch static values only returns rows currently valid today`() {
        val today = LocalDate.now()

        val current = StaticValueEntity().apply {
            id = 1
            type = StaticValueType.TOLERANCE
            validFrom = today.minusDays(10)
            validTo = LocalDate.of(2999, 12, 31)
            amount = BigDecimal("100.00")
        }
        val expired = StaticValueEntity().apply {
            id = 2
            type = StaticValueType.TOLERANCE
            validFrom = LocalDate.of(1900, 1, 1)
            validTo = today.minusDays(11)
            amount = BigDecimal("50.00")
        }
        val notYetValid = StaticValueEntity().apply {
            id = 3
            type = StaticValueType.INCOME_LIMIT
            validFrom = today.plusDays(1)
            validTo = LocalDate.of(2999, 12, 31)
            amount = BigDecimal("1328.00")
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
        val existing = StaticValueEntity().apply {
            id = 1
            type = StaticValueType.INCOME_LIMIT
            validFrom = LocalDate.of(2022, 1, 1)
            validTo = LocalDate.of(2999, 12, 31)
            amount = BigDecimal("1328.00")
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
        val existing = StaticValueEntity().apply {
            id = 1
            type = StaticValueType.TOLERANCE
            validFrom = today
            validTo = LocalDate.of(2999, 12, 31)
            amount = BigDecimal("100.00")
        }
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

    @Test
    fun `fetch login attempts sorted by most recent failure first`() {
        val older = LoginAttemptEntity().apply {
            id = 1
            username = "user1"
            failureCount = 1
            lastFailureAt = LocalDate.of(2026, 1, 1).atStartOfDay()
            lockedUntil = null
        }
        val newer = LoginAttemptEntity().apply {
            id = 2
            username = "user2"
            failureCount = 3
            lastFailureAt = LocalDate.of(2026, 1, 2).atStartOfDay()
            lockedUntil = LocalDate.of(2026, 1, 2).atStartOfDay().plusMinutes(15)
        }
        every { loginAttemptService.findAll() } returns listOf(older, newer)

        val response = service.getLoginAttempts()

        assertThat(response.loginAttempts).containsExactly(
            LoginAttemptItem(
                id = 2,
                username = "user2",
                failureCount = 3,
                lastFailureAt = newer.lastFailureAt!!,
                lockedUntil = newer.lockedUntil,
            ),
            LoginAttemptItem(
                id = 1,
                username = "user1",
                failureCount = 1,
                lastFailureAt = older.lastFailureAt!!,
                lockedUntil = null,
            ),
        )
    }

    @Test
    fun `delete login attempt`() {
        service.deleteLoginAttempt(1L)

        verify(exactly = 1) { loginAttemptService.deleteById(1L) }
    }
}
