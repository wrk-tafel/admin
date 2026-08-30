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
import at.wrk.tafel.admin.backend.modules.base.exception.BusinessRuleException
import at.wrk.tafel.admin.backend.modules.base.exception.ConflictException
import at.wrk.tafel.admin.backend.modules.base.exception.NotFoundException
import at.wrk.tafel.admin.backend.modules.settings.model.MailRecipientAddressItem
import at.wrk.tafel.admin.backend.modules.settings.model.MailRecipientAdresses
import at.wrk.tafel.admin.backend.modules.settings.model.MailRecipientType
import at.wrk.tafel.admin.backend.modules.settings.model.MailRecipientsPerMailType
import at.wrk.tafel.admin.backend.modules.settings.model.MailRecipientsRequest
import at.wrk.tafel.admin.backend.modules.settings.model.MailRecipientsResponse
import at.wrk.tafel.admin.backend.modules.settings.model.StaticValueRequest
import at.wrk.tafel.admin.backend.modules.settings.model.StaticValueResponse
import ch.qos.logback.classic.Level
import ch.qos.logback.classic.Logger
import ch.qos.logback.classic.spi.ILoggingEvent
import ch.qos.logback.core.read.ListAppender
import io.mockk.every
import io.mockk.impl.annotations.InjectMockKs
import io.mockk.impl.annotations.RelaxedMockK
import io.mockk.junit5.MockKExtension
import io.mockk.slot
import io.mockk.verify
import org.assertj.core.api.Assertions.assertThat
import org.assertj.core.api.Assertions.assertThatThrownBy
import org.assertj.core.api.Assertions.tuple
import org.junit.jupiter.api.Test
import org.junit.jupiter.api.extension.ExtendWith
import org.slf4j.LoggerFactory
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
                                    MailRecipientAddressItem(id = testMailRecipient_DR_TO1.id, address = testMailRecipient_DR_TO1.address),
                                    MailRecipientAddressItem(id = testMailRecipient_DR_TO2.id, address = testMailRecipient_DR_TO2.address),
                                ),
                            ),
                            MailRecipientAdresses(
                                recipientType = MailRecipientType.CC,
                                addresses = listOf(
                                    MailRecipientAddressItem(id = testMailRecipient_DR_CC1.id, address = testMailRecipient_DR_CC1.address),
                                    MailRecipientAddressItem(id = testMailRecipient_DR_CC2.id, address = testMailRecipient_DR_CC2.address),
                                ),
                            ),
                            MailRecipientAdresses(
                                recipientType = MailRecipientType.BCC,
                                addresses = listOf(
                                    MailRecipientAddressItem(id = testMailRecipient_DR_BCC1.id, address = testMailRecipient_DR_BCC1.address),
                                    MailRecipientAddressItem(id = testMailRecipient_DR_BCC2.id, address = testMailRecipient_DR_BCC2.address),
                                ),
                            ),
                        ),
                    ),
                ),
            ),
        )
    }

    @Test
    fun `update mail recipients creates new addresses without touching deleteAll`() {
        val updatedSettings = MailRecipientsRequest(
            mailRecipients = listOf(
                MailRecipientsPerMailType(
                    mailType = MailType.DAILY_REPORT.name,
                    recipients = listOf(
                        MailRecipientAdresses(
                            recipientType = MailRecipientType.TO,
                            addresses = listOf(MailRecipientAddressItem(address = "to1"), MailRecipientAddressItem(address = "to2")),
                        ),
                        MailRecipientAdresses(
                            recipientType = MailRecipientType.CC,
                            addresses = listOf(MailRecipientAddressItem(address = "cc1"), MailRecipientAddressItem(address = "cc2")),
                        ),
                        MailRecipientAdresses(
                            recipientType = MailRecipientType.BCC,
                            addresses = listOf(MailRecipientAddressItem(address = "bcc1"), MailRecipientAddressItem(address = "bcc2")),
                        ),
                    ),
                ),
            ),
        )
        every { mailRecipientRepository.findAllById(emptyList()) } returns emptyList()

        service.updateMailRecipients(updatedSettings)

        verify(exactly = 0) { mailRecipientRepository.deleteAll() }
        val recipientsSlot = slot<List<MailRecipientEntity>>()
        verify { mailRecipientRepository.saveAll(capture(recipientsSlot)) }

        assertThat(recipientsSlot.captured).extracting("mailType", "recipientType", "address").containsExactly(
            tuple(MailType.DAILY_REPORT, RecipientType.TO, "to1"),
            tuple(MailType.DAILY_REPORT, RecipientType.TO, "to2"),
            tuple(MailType.DAILY_REPORT, RecipientType.CC, "cc1"),
            tuple(MailType.DAILY_REPORT, RecipientType.CC, "cc2"),
            tuple(MailType.DAILY_REPORT, RecipientType.BCC, "bcc1"),
            tuple(MailType.DAILY_REPORT, RecipientType.BCC, "bcc2"),
        )
    }

    @Test
    fun `update mail recipients updates an existing address in place, keeping its id`() {
        val existing = MailRecipientEntity(
            mailType = MailType.DAILY_REPORT,
            recipientType = RecipientType.TO,
            address = "old@test.com",
        ).apply { id = 42 }
        every { mailRecipientRepository.findAllById(listOf(42L)) } returns listOf(existing)

        val updatedSettings = MailRecipientsRequest(
            mailRecipients = listOf(
                MailRecipientsPerMailType(
                    mailType = MailType.DAILY_REPORT.name,
                    recipients = listOf(
                        MailRecipientAdresses(
                            recipientType = MailRecipientType.TO,
                            addresses = listOf(MailRecipientAddressItem(id = 42L, address = "new@test.com")),
                        ),
                    ),
                ),
            ),
        )

        service.updateMailRecipients(updatedSettings)

        assertThat(existing.address).isEqualTo("new@test.com")
        verify(exactly = 0) { mailRecipientRepository.deleteAll() }
        verify { mailRecipientRepository.saveAll(listOf(existing)) }
    }

    @Test
    fun `update mail recipients filters out blank addresses`() {
        val updatedSettings = MailRecipientsRequest(
            mailRecipients = listOf(
                MailRecipientsPerMailType(
                    mailType = MailType.DAILY_REPORT.name,
                    recipients = listOf(
                        MailRecipientAdresses(
                            recipientType = MailRecipientType.TO,
                            addresses = listOf(MailRecipientAddressItem(address = "     ")),
                        ),
                        MailRecipientAdresses(
                            recipientType = MailRecipientType.CC,
                            addresses = listOf(MailRecipientAddressItem(address = "      c  c1         ")),
                        ),
                    ),
                ),
            ),
        )
        every { mailRecipientRepository.findAllById(emptyList()) } returns emptyList()

        service.updateMailRecipients(updatedSettings)

        val recipientsSlot = slot<List<MailRecipientEntity>>()
        verify { mailRecipientRepository.saveAll(capture(recipientsSlot)) }

        assertThat(recipientsSlot.captured).extracting("mailType", "recipientType", "address").containsExactly(
            tuple(MailType.DAILY_REPORT, RecipientType.CC, "      c  c1         "),
        )
    }

    @Test
    fun `update mail recipients fails with a business rule exception for an unknown mail type`() {
        val updatedSettings = MailRecipientsRequest(
            mailRecipients = listOf(
                MailRecipientsPerMailType(
                    mailType = "NOT_A_REAL_MAIL_TYPE",
                    recipients = listOf(
                        MailRecipientAdresses(recipientType = MailRecipientType.TO, addresses = listOf(MailRecipientAddressItem(address = "to1"))),
                    ),
                ),
            ),
        )

        assertThatThrownBy { service.updateMailRecipients(updatedSettings) }
            .isInstanceOf(BusinessRuleException::class.java)

        verify(exactly = 0) { mailRecipientRepository.saveAll(any<List<MailRecipientEntity>>()) }
    }

    /**
     * An id looked up purely by its numeric value, ignoring which (mailType, recipientType) group it
     * was submitted under, would otherwise silently re-parent an existing address into a different
     * category instead of being rejected - see issue #3531.
     */
    @Test
    fun `update mail recipients fails with a conflict when an id is submitted under a different mailType-recipientType group`() {
        val existing = MailRecipientEntity(
            mailType = MailType.STATISTICS,
            recipientType = RecipientType.TO,
            address = "existing@test.com",
        ).apply { id = 42 }
        every { mailRecipientRepository.findAllById(listOf(42L)) } returns listOf(existing)

        val updatedSettings = MailRecipientsRequest(
            mailRecipients = listOf(
                MailRecipientsPerMailType(
                    mailType = MailType.DAILY_REPORT.name,
                    recipients = listOf(
                        MailRecipientAdresses(
                            recipientType = MailRecipientType.CC,
                            addresses = listOf(MailRecipientAddressItem(id = 42L, address = "existing@test.com")),
                        ),
                    ),
                ),
            ),
        )

        assertThatThrownBy { service.updateMailRecipients(updatedSettings) }
            .isInstanceOf(ConflictException::class.java)

        assertThat(existing.mailType).isEqualTo(MailType.STATISTICS)
        assertThat(existing.recipientType).isEqualTo(RecipientType.TO)
        verify(exactly = 0) { mailRecipientRepository.saveAll(any<List<MailRecipientEntity>>()) }
    }

    @Test
    fun `delete mail recipient`() {
        every { mailRecipientRepository.existsById(1L) } returns true

        service.deleteMailRecipient(1L)

        verify { mailRecipientRepository.deleteById(1L) }
    }

    @Test
    fun `delete mail recipient fails when id is not found`() {
        every { mailRecipientRepository.existsById(99L) } returns false

        assertThatThrownBy { service.deleteMailRecipient(99L) }
            .isInstanceOf(NotFoundException::class.java)

        verify(exactly = 0) { mailRecipientRepository.deleteById(any()) }
    }

    @Test
    fun `delete mail recipient logs the deletion`() {
        every { mailRecipientRepository.existsById(1L) } returns true

        withLogAppender(SettingsService::class.java) { logAppender ->
            service.deleteMailRecipient(1L)

            assertThat(logAppender.list).anySatisfy {
                assertThat(it.level).isEqualTo(Level.INFO)
                assertThat(it.formattedMessage).contains("Deleted mail recipient")
            }
        }
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

    /**
     * A stale row - already closed off by a concurrent edit (e.g. two tabs open on the same value) -
     * must be rejected rather than historized a second time, which would otherwise leave two rows
     * both valid today for the same (type, countAdults, countChildren, age) and break
     * findSingleValueOfType's single-row assumption for every later lookup - see issue #3531.
     */
    @Test
    fun `update static value fails with conflict when the row is no longer the currently valid one`() {
        val today = LocalDate.now()
        val staleRow = StaticValueEntity(
            validFrom = LocalDate.of(2022, 1, 1),
            // already closed off by an earlier, concurrent edit
            validTo = today.minusDays(1),
            type = StaticValueType.INCOME_LIMIT,
            amount = BigDecimal("1328.00"),
        ).apply {
            id = 1
            countAdults = 1
            countChildren = 0
        }
        every { staticValueRepository.findByIdOrNull(1L) } returns staleRow

        val requestedChanges = StaticValueRequest(
            id = 1,
            type = "INCOME_LIMIT",
            validFrom = LocalDate.of(2022, 1, 1),
            validTo = today.minusDays(1),
            amount = BigDecimal("1500.00"),
            countAdults = 1,
            countChildren = 0,
            age = null,
        )

        assertThatThrownBy { service.updateStaticValue(1L, requestedChanges) }
            .isInstanceOf(ConflictException::class.java)

        verify(exactly = 0) { staticValueRepository.save(any()) }
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
    fun `update mail recipients logs the update`() {
        val updatedSettings = MailRecipientsRequest(
            mailRecipients = listOf(
                MailRecipientsPerMailType(
                    mailType = MailType.DAILY_REPORT.name,
                    recipients = listOf(
                        MailRecipientAdresses(recipientType = MailRecipientType.TO, addresses = listOf(MailRecipientAddressItem(address = "to1"))),
                    ),
                ),
            ),
        )
        every { mailRecipientRepository.findAllById(emptyList()) } returns emptyList()

        withLogAppender(SettingsService::class.java) { logAppender ->
            service.updateMailRecipients(updatedSettings)

            assertThat(logAppender.list).anySatisfy {
                assertThat(it.level).isEqualTo(Level.INFO)
                assertThat(it.formattedMessage).contains("Updated mail recipients")
            }
        }
    }

    @Test
    fun `update static value logs the update`() {
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

        withLogAppender(SettingsService::class.java) { logAppender ->
            service.updateStaticValue(1L, requestedChanges)

            assertThat(logAppender.list).anySatisfy {
                assertThat(it.level).isEqualTo(Level.INFO)
                assertThat(it.formattedMessage).contains("Updated static value").contains("1").contains("999.00")
            }
        }
    }

    private fun withLogAppender(loggerClass: Class<*>, block: (ListAppender<ILoggingEvent>) -> Unit) {
        val logger = LoggerFactory.getLogger(loggerClass) as Logger
        val logAppender = ListAppender<ILoggingEvent>().apply { start() }
        logger.addAppender(logAppender)
        try {
            block(logAppender)
        } finally {
            logger.detachAppender(logAppender)
        }
    }
}
