package at.wrk.tafel.admin.backend.modules.reporting.service.internal

import at.wrk.tafel.admin.backend.common.events.DistributionClosedEvent
import at.wrk.tafel.admin.backend.common.mail.MailAttachment
import at.wrk.tafel.admin.backend.common.mail.MailSenderService
import at.wrk.tafel.admin.backend.common.pdf.PDFService
import at.wrk.tafel.admin.backend.common.testdata.testDistributionCustomerEntity1
import at.wrk.tafel.admin.backend.common.testdata.testDistributionCustomerEntity2
import at.wrk.tafel.admin.backend.common.testdata.testDistributionEntity
import at.wrk.tafel.admin.backend.common.testdata.testDistributionStatistic
import at.wrk.tafel.admin.backend.database.entities.distribution.DistributionEntity
import at.wrk.tafel.admin.backend.database.entities.distribution.DistributionStatisticEntity
import at.wrk.tafel.admin.backend.database.repositories.distribution.DistributionRepository
import at.wrk.tafel.admin.backend.database.repositories.distribution.DistributionStatisticRepository
import at.wrk.tafel.admin.backend.modules.reporting.service.internal.model.DailyReportPdfModel
import io.mockk.every
import io.mockk.impl.annotations.InjectMockKs
import io.mockk.impl.annotations.RelaxedMockK
import io.mockk.junit5.MockKExtension
import io.mockk.mockk
import io.mockk.slot
import io.mockk.verify
import org.assertj.core.api.Assertions.assertThat
import org.junit.jupiter.api.Test
import org.junit.jupiter.api.extension.ExtendWith
import org.springframework.util.MimeTypeUtils
import java.math.BigDecimal
import java.time.LocalDate
import java.time.LocalDateTime
import java.time.format.DateTimeFormatter
import java.util.*

@ExtendWith(MockKExtension::class)
internal class DailyReportInternalServiceTest {

    @RelaxedMockK
    private lateinit var pdfService: PDFService

    @RelaxedMockK
    private lateinit var mailSenderService: MailSenderService

    @RelaxedMockK
    private lateinit var distributionRepository: DistributionRepository

    @RelaxedMockK
    private lateinit var distributionStatisticRepository: DistributionStatisticRepository

    @InjectMockKs
    private lateinit var service: DailyReportInternalService

    @Test
    fun `generate daily report pdf`() {
        val statistic = DistributionStatisticEntity().apply {
            countCustomers = 1
            countPersons = 2
            countInfants = 3
            averagePersonsPerCustomer = BigDecimal("4.4")
            countCustomersNew = 5
            countPersonsNew = 6
            countCustomersProlonged = 7
            countPersonsProlonged = 8
            countCustomersUpdated = 9
        }

        every { pdfService.generatePdf(any(), any()) } returns ByteArray(0)

        val pdfBytes = service.generateDailyReportPdf(statistic)
        assertThat(pdfBytes).isNotNull

        val pdfModelSlot = slot<DailyReportPdfModel>()
        verify { pdfService.generatePdf(capture(pdfModelSlot), "/pdf-templates/daily-report/dailyreport-document.xsl") }

        val pdfModel = pdfModelSlot.captured
        assertThat(pdfModel).isNotNull
        assertThat(pdfModel.logoContentType).isEqualTo(MimeTypeUtils.IMAGE_PNG_VALUE)
        assertThat(pdfModel.logoBytes).isNotNull()

        val date = statistic.distribution?.startedAt?.toLocalDate()?.format(DateTimeFormatter.ofPattern("dd.MM.yyyy"))
        val startTime = statistic.distribution?.startedAt?.format(DateTimeFormatter.ofPattern("HH:mm"))
        val endTime = statistic.distribution?.endedAt?.format(DateTimeFormatter.ofPattern("HH:mm"))
        assertThat(pdfModel.date).isEqualTo("$date $startTime - $endTime")

        assertThat(pdfModel.countCustomers).isEqualTo(statistic.countCustomers)
        assertThat(pdfModel.countPersons).isEqualTo(statistic.countPersons)
        assertThat(pdfModel.countInfants).isEqualTo(statistic.countInfants)
        assertThat(pdfModel.averagePersonsPerCustomer).isEqualTo(statistic.averagePersonsPerCustomer)
        assertThat(pdfModel.countCustomersNew).isEqualTo(statistic.countCustomersNew)
        assertThat(pdfModel.countPersonsNew).isEqualTo(statistic.countPersonsNew)
        assertThat(pdfModel.countCustomersProlonged).isEqualTo(statistic.countCustomersProlonged)
        assertThat(pdfModel.countPersonsProlonged).isEqualTo(statistic.countPersonsProlonged)
        assertThat(pdfModel.countCustomersUpdated).isEqualTo(statistic.countCustomersUpdated)
    }

    // TODO

    @Test
    fun `processDistributionClosed sends report per mail`() {
        val distributionId = 123L
        val distribution = mockk<DistributionEntity>()
        every { distribution.id } returns distributionId
        every { distribution.startedAt } returns LocalDateTime.now().minusHours(5)
        every { distribution.endedAt } returns LocalDateTime.now()
        val customerList = listOf(
            testDistributionCustomerEntity1,
            testDistributionCustomerEntity2
        )
        every { distribution.customers } returns customerList
        every { distributionRepository.findById(distributionId) } returns Optional.of(distribution)

        every { distributionStatisticRepository.findByDistributionId(distributionId) } returns testDistributionStatistic
        every { distributionRepository.findById(distributionId) } returns Optional.of(distribution)

        val pdfBytes = ByteArray(10)
        every {
            pdfService.generatePdf(any(), "/pdf-templates/daily-report/dailyreport-document.xsl")
        } returns pdfBytes

        service.processDistributionClosed(DistributionClosedEvent(distributionId = distributionId))

        verify(exactly = 1) { pdfService.generatePdf(any(), "/pdf-templates/daily-report/dailyreport-document.xsl") }

        val mailSubject =
            "TÖ Tafel 1030 - Tages-Report vom ${LocalDate.now().format(DateTimeFormatter.ofPattern("dd.MM.yyyy"))}"
        val mailText = "Details im Anhang"

        val mailAttachmentSlot = slot<List<MailAttachment>>()
        verify { mailSenderService.sendMail(mailSubject, mailText, capture(mailAttachmentSlot)) }

        val attachmentList = mailAttachmentSlot.captured
        assertThat(attachmentList).hasSize(1)

        val dateFormatted = LocalDate.now().format(DateTimeFormatter.ofPattern("ddMMyyyy"))
        val attachment = attachmentList[0]
        assertThat(attachment.filename).isEqualTo("tagesreport_${dateFormatted}.pdf")
        assertThat(attachment.inputStreamSource).isNotNull
        assertThat(attachment.contentType).isEqualTo("application/pdf")
    }

    @Test
    fun `processDistributionClosed skips report and generation and sending email without customers`() {
        val distributionId = 123L
        val distribution = mockk<DistributionEntity>()
        every { distribution.id } returns distributionId
        every { distribution.customers } returns emptyList()
        every { distributionRepository.findById(distributionId) } returns Optional.of(distribution)

        service.processDistributionClosed(DistributionClosedEvent(distributionId = distributionId))

        verify(exactly = 0) { mailSenderService.sendMail(any(), any(), any()) }
    }


}
