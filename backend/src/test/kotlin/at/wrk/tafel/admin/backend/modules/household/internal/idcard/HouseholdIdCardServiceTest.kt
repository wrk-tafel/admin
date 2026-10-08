package at.wrk.tafel.admin.backend.modules.household.internal.idcard

import at.wrk.tafel.admin.backend.common.mail.MailAttachment
import at.wrk.tafel.admin.backend.common.mail.MailSenderService
import at.wrk.tafel.admin.backend.config.properties.TafelAdminMailProperties
import at.wrk.tafel.admin.backend.config.properties.TafelAdminProperties
import at.wrk.tafel.admin.backend.config.properties.TafelAdminWalletProperties
import at.wrk.tafel.admin.backend.database.common.audit.AuditLogWriter
import at.wrk.tafel.admin.backend.database.common.audit.AuditOperation
import at.wrk.tafel.admin.backend.database.model.household.HouseholdEntity
import at.wrk.tafel.admin.backend.database.model.household.HouseholdRepository
import at.wrk.tafel.admin.backend.database.model.person.PersonEntity
import at.wrk.tafel.admin.backend.modules.base.country.testCountry1
import at.wrk.tafel.admin.backend.modules.base.exception.BusinessRuleException
import at.wrk.tafel.admin.backend.modules.base.exception.NotFoundException
import at.wrk.tafel.admin.backend.modules.household.HouseholdIdCardFormat
import at.wrk.tafel.admin.backend.modules.household.internal.masterdata.HouseholdPdfService
import at.wrk.tafel.admin.backend.modules.household.internal.masterdata.IdCardSummary
import io.mockk.every
import io.mockk.impl.annotations.RelaxedMockK
import io.mockk.junit5.MockKExtension
import io.mockk.slot
import io.mockk.verify
import org.assertj.core.api.Assertions.assertThat
import org.assertj.core.api.Assertions.assertThatThrownBy
import org.junit.jupiter.api.BeforeEach
import org.junit.jupiter.api.Test
import org.junit.jupiter.api.extension.ExtendWith
import org.thymeleaf.context.Context
import java.time.LocalDate

@ExtendWith(MockKExtension::class)
class HouseholdIdCardServiceTest {

    @RelaxedMockK
    private lateinit var householdRepository: HouseholdRepository

    @RelaxedMockK
    private lateinit var householdPdfService: HouseholdPdfService

    @RelaxedMockK
    private lateinit var walletPassService: WalletPassService

    @RelaxedMockK
    private lateinit var mailSenderService: MailSenderService

    @RelaxedMockK
    private lateinit var auditLogWriter: AuditLogWriter

    private val properties = TafelAdminProperties()
    private val summary = IdCardSummary(householdId = 4101, fullName = "Max Mustermann", countPersons = 1, countInfants = 0)

    private lateinit var household: HouseholdEntity
    private lateinit var service: HouseholdIdCardService

    @BeforeEach
    fun beforeEach() {
        properties.mail = TafelAdminMailProperties().apply { from = "no-reply@example.org" }
        properties.wallet = TafelAdminWalletProperties().apply {
            passTypeIdentifier = "pass.at.example.tafel"
            teamIdentifier = "ABCDE12345"
            certificatePath = "/config/pass.p12"
            certificatePassword = "secret"
            wwdrCertificatePath = "/config/wwdr.cer"
        }

        household = HouseholdEntity(householdId = 4101, validUntil = LocalDate.of(2030, 1, 1)).apply {
            id = 17
            email = " max@example.org "
        }
        val mainPerson = PersonEntity(household = household, country = testCountry1, isMainPerson = true).apply {
            firstname = "Max"
            lastname = "Mustermann"
        }
        household.persons = mutableListOf(mainPerson)
        household.mainPerson = mainPerson

        every { householdRepository.findByHouseholdId(4101) } returns household
        every { householdRepository.findByHouseholdId(999) } returns null
        every { householdPdfService.generateDigitalIdCardPdf(household) } returns "pdf".toByteArray()
        every { householdPdfService.generateDigitalIdCardImage(household) } returns "png".toByteArray()
        every { householdPdfService.createIdCardSummary(household) } returns summary
        every { walletPassService.generatePass(summary) } returns "pass".toByteArray()

        service = HouseholdIdCardService(
            householdRepository,
            householdPdfService,
            walletPassService,
            mailSenderService,
            auditLogWriter,
            properties,
        )
    }

    @Test
    fun `generates each format with its own file name and content type`() {
        val pdf = service.generateIdCard(4101, HouseholdIdCardFormat.PDF)
        assertThat(pdf.filename).isEqualTo("ausweis-4101-mustermann-max.pdf")
        assertThat(pdf.contentType).isEqualTo("application/pdf")
        assertThat(pdf.bytes).isEqualTo("pdf".toByteArray())

        val image = service.generateIdCard(4101, HouseholdIdCardFormat.IMAGE)
        assertThat(image.filename).isEqualTo("ausweis-4101-mustermann-max.png")
        assertThat(image.contentType).isEqualTo("image/png")
        assertThat(image.bytes).isEqualTo("png".toByteArray())

        val wallet = service.generateIdCard(4101, HouseholdIdCardFormat.WALLET)
        assertThat(wallet.filename).isEqualTo("ausweis-4101-mustermann-max.pkpass")
        assertThat(wallet.contentType).isEqualTo("application/vnd.apple.pkpass")
        assertThat(wallet.bytes).isEqualTo("pass".toByteArray())
    }

    @Test
    fun `a download is recorded as a read of the household`() {
        service.generateIdCard(4101, HouseholdIdCardFormat.IMAGE)

        val entry = slot<AuditLogWriter.PendingEntry>()
        verify(exactly = 1) { auditLogWriter.record(capture(entry)) }
        assertThat(entry.captured.entityType).isEqualTo("Household")
        assertThat(entry.captured.entityId).isEqualTo(17)
        assertThat(entry.captured.businessKey).isEqualTo("4101")
        assertThat(entry.captured.operation).isEqualTo(AuditOperation.READ)
        assertThat(entry.captured.changedFields).isEmpty()
    }

    @Test
    fun `an unknown household is not found`() {
        assertThatThrownBy { service.generateIdCard(999, HouseholdIdCardFormat.PDF) }
            .isInstanceOf(NotFoundException::class.java)
        assertThatThrownBy { service.sendIdCardByMail(999, setOf(HouseholdIdCardFormat.PDF)) }
            .isInstanceOf(NotFoundException::class.java)
    }

    @Test
    fun `the wallet format is refused where no pass can be signed`() {
        properties.wallet = null

        assertThatThrownBy { service.generateIdCard(4101, HouseholdIdCardFormat.WALLET) }
            .isInstanceOf(BusinessRuleException::class.java)
        verify(exactly = 0) { walletPassService.generatePass(any()) }
        verify(exactly = 0) { auditLogWriter.record(any()) }
    }

    @Test
    fun `mails the selected formats to the address stored on the household`() {
        // requested out of order on purpose - the mail is composed in a fixed one
        service.sendIdCardByMail(4101, linkedSetOf(HouseholdIdCardFormat.WALLET, HouseholdIdCardFormat.PDF))

        val attachments = slot<List<MailAttachment>>()
        val context = slot<Context>()
        verify(exactly = 1) {
            mailSenderService.sendHtmlMailTo(
                mailType = "Digitaler Ausweis",
                recipients = listOf("max@example.org"),
                subject = "Ihre Bezugskarte der Team Österreich Tafel",
                attachments = capture(attachments),
                templateName = "mails/id-card-mail",
                context = capture(context),
            )
        }
        assertThat(attachments.captured.map { it.filename }).containsExactly(
            "ausweis-4101-mustermann-max.pdf",
            "ausweis-4101-mustermann-max.pkpass",
        )
        assertThat(attachments.captured.map { it.contentType }).containsExactly("application/pdf", "application/vnd.apple.pkpass")
        assertThat(context.captured.getVariable("greeting")).isEqualTo("Guten Tag,")
        assertThat(context.captured.getVariable("householdId")).isEqualTo(4101L)
        assertThat(context.captured.getVariable("hasPdf")).isEqualTo(true)
        assertThat(context.captured.getVariable("hasImage")).isEqualTo(false)
        assertThat(context.captured.getVariable("hasWallet")).isEqualTo(true)

        verify(exactly = 0) { householdPdfService.generateDigitalIdCardImage(any()) }
    }

    @Test
    fun `a sent mail is recorded with the formats it carried`() {
        service.sendIdCardByMail(4101, setOf(HouseholdIdCardFormat.IMAGE, HouseholdIdCardFormat.PDF))

        val entry = slot<AuditLogWriter.PendingEntry>()
        verify(exactly = 1) { auditLogWriter.record(capture(entry)) }
        assertThat(entry.captured.operation).isEqualTo(AuditOperation.READ)
        assertThat(entry.captured.businessKey).isEqualTo("4101")
        assertThat(entry.captured.changedFields).isEqualTo(mapOf("idCardSentByMail" to listOf(null, "PDF, Bild")))
    }

    @Test
    fun `a household without an e-mail address gets no mail`() {
        household.email = "  "

        assertThatThrownBy { service.sendIdCardByMail(4101, setOf(HouseholdIdCardFormat.PDF)) }
            .isInstanceOf(BusinessRuleException::class.java)
        verifyNothingSent()
    }

    @Test
    fun `no mail is sent without a format`() {
        assertThatThrownBy { service.sendIdCardByMail(4101, emptySet()) }.isInstanceOf(BusinessRuleException::class.java)
        verifyNothingSent()
    }

    @Test
    fun `no mail is sent where mailing id cards is switched off or mail is not configured`() {
        properties.features.idCardMailEnabled = false
        assertThatThrownBy { service.sendIdCardByMail(4101, setOf(HouseholdIdCardFormat.PDF)) }
            .isInstanceOf(BusinessRuleException::class.java)

        properties.features.idCardMailEnabled = true
        properties.mail = null
        assertThatThrownBy { service.sendIdCardByMail(4101, setOf(HouseholdIdCardFormat.PDF)) }
            .isInstanceOf(BusinessRuleException::class.java)

        verifyNothingSent()
    }

    @Test
    fun `a mail with a wallet pass that cannot be signed is not sent at all`() {
        properties.features.walletPassEnabled = false

        assertThatThrownBy { service.sendIdCardByMail(4101, setOf(HouseholdIdCardFormat.PDF, HouseholdIdCardFormat.WALLET)) }
            .isInstanceOf(BusinessRuleException::class.java)
        verifyNothingSent()
    }

    private fun verifyNothingSent() {
        verify(exactly = 0) { mailSenderService.sendHtmlMailTo(any(), any(), any(), any(), any(), any()) }
        verify(exactly = 0) { auditLogWriter.record(any()) }
    }
}
