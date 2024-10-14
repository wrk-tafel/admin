package at.wrk.tafel.admin.backend.modules.distribution.internal

import at.wrk.tafel.admin.backend.common.mail.MailAttachment
import at.wrk.tafel.admin.backend.common.mail.MailSenderService
import at.wrk.tafel.admin.backend.database.entities.distribution.DistributionEntity
import at.wrk.tafel.admin.backend.database.entities.distribution.DistributionStatisticEntity
import at.wrk.tafel.admin.backend.database.repositories.distribution.DistributionRepository
import at.wrk.tafel.admin.backend.modules.distribution.internal.statistic.DistributionStatisticService
import at.wrk.tafel.admin.backend.modules.reporting.DailyReportService
import io.mockk.every
import io.mockk.impl.annotations.InjectMockKs
import io.mockk.impl.annotations.RelaxedMockK
import io.mockk.impl.annotations.SpyK
import io.mockk.junit5.MockKExtension
import io.mockk.mockk
import io.mockk.slot
import io.mockk.verify
import org.assertj.core.api.Assertions.assertThat
import org.junit.jupiter.api.Test
import org.junit.jupiter.api.extension.ExtendWith
import org.springframework.transaction.support.TransactionTemplate
import java.time.LocalDate
import java.time.format.DateTimeFormatter
import java.util.*

@ExtendWith(MockKExtension::class)
internal class DistributionPostProcessorServiceTest {

    @RelaxedMockK
    private lateinit var distributionStatisticService: DistributionStatisticService

    @RelaxedMockK
    private lateinit var dailyReportService: DailyReportService

    @RelaxedMockK
    private lateinit var mailSenderService: MailSenderService

    @SpyK
    private var transactionTemplate: TransactionTemplate = TransactionTemplate(mockk(relaxed = true))

    @RelaxedMockK
    private lateinit var distributionRepository: DistributionRepository

    @InjectMockKs
    private lateinit var service: DistributionPostProcessorService

    @Test
    fun `process calls proper services`() {
        val distributionId = 123L
        val distribution = mockk<DistributionEntity>()
        every { distribution.id } returns distributionId
        every { distribution.customers } returns listOf(testDistributionCustomerEntity1, testDistributionCustomerEntity2)

        val distributionStatistic = mockk<DistributionStatisticEntity>()
        every { distributionStatisticService.createAndSaveStatistic(distribution) } returns distributionStatistic
        every { distributionRepository.findById(distributionId) } returns Optional.of(distribution)

        val pdfBytes = ByteArray(10)
        every { dailyReportService.generateDailyReportPdf(any()) } returns pdfBytes

        service.process(distributionId)

        verify { distributionStatisticService.createAndSaveStatistic(distribution) }
        verify { dailyReportService.generateDailyReportPdf(distributionStatistic) }

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

        verify(exactly = 1) { transactionTemplate.executeWithoutResult(any()) }
    }

    @Test
    fun `process skips report and generation and sending email without customers`() {
        val distributionId = 123L
        val distribution = mockk<DistributionEntity>()
        every { distribution.id } returns distributionId
        every { distribution.customers } returns emptyList()

        val distributionStatistic = mockk<DistributionStatisticEntity>()
        every { distributionStatisticService.createAndSaveStatistic(distribution) } returns distributionStatistic
        every { distributionRepository.findById(distributionId) } returns Optional.of(distribution)

        service.process(distributionId)

        verify { distributionStatisticService.createAndSaveStatistic(distribution) }
        verify(exactly = 0) { dailyReportService.generateDailyReportPdf(distributionStatistic) }
        verify(exactly = 1) { transactionTemplate.executeWithoutResult(any()) }
    }

}
