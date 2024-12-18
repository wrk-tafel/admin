package at.wrk.tafel.admin.backend.modules.distribution.internal

import at.wrk.tafel.admin.backend.common.mail.MailAttachment
import at.wrk.tafel.admin.backend.common.mail.MailSenderService
import at.wrk.tafel.admin.backend.config.TafelAdminProperties
import at.wrk.tafel.admin.backend.database.model.distribution.DistributionEntity
import at.wrk.tafel.admin.backend.database.model.distribution.DistributionRepository
import at.wrk.tafel.admin.backend.database.model.distribution.DistributionStatisticEntity
import at.wrk.tafel.admin.backend.modules.distribution.internal.statistic.DistributionStatisticService
import at.wrk.tafel.admin.backend.modules.reporting.DailyReportService
import at.wrk.tafel.admin.backend.modules.reporting.StatisticExportService
import at.wrk.tafel.admin.backend.modules.reporting.StatisticZipFile
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

    @RelaxedMockK
    private lateinit var tafelAdminProperties: TafelAdminProperties

    @RelaxedMockK
    private lateinit var statisticExportService: StatisticExportService

    @SpyK
    private var transactionTemplate: TransactionTemplate = TransactionTemplate(mockk(relaxed = true))

    @RelaxedMockK
    private lateinit var distributionRepository: DistributionRepository

    @InjectMockKs
    private lateinit var service: DistributionPostProcessorService

    @Test
    fun `process calls proper services`() {
        val dateFormatted = LocalDate.now().format(DateTimeFormatter.ofPattern("ddMMyyyy"))

        val distributionId = 123L
        val distribution = mockk<DistributionEntity>()
        every { distribution.id } returns distributionId
        every { distribution.customers } returns listOf(
            testDistributionCustomerEntity1,
            testDistributionCustomerEntity2
        )

        val distributionStatistic = mockk<DistributionStatisticEntity>()
        every { distributionStatisticService.createAndSaveStatistic(distribution) } returns distributionStatistic
        every { distributionRepository.findById(distributionId) } returns Optional.of(distribution)

        val pdfBytes = ByteArray(10)
        every { dailyReportService.generateDailyReportPdf(any()) } returns pdfBytes

        every { statisticExportService.exportStatisticZipFile(any()) } returns StatisticZipFile(
            filename = "statistics.zip",
            content = ByteArray(0)
        )

        service.process(distributionId)

        verify { distributionStatisticService.createAndSaveStatistic(distribution) }

        assertDailyReport(distributionStatistic, dateFormatted)
        assertStatisticFile(distributionStatistic)
    }

    private fun assertDailyReport(
        distributionStatistic: DistributionStatisticEntity,
        dateFormatted: String
    ) {
        verify { dailyReportService.generateDailyReportPdf(distributionStatistic) }

        val dailyReportMailSubject =
            "TÖ Tafel 1030 - Tages-Report vom ${LocalDate.now().format(DateTimeFormatter.ofPattern("dd.MM.yyyy"))}"
        val dailyReportMailText = "Details im Anhang"

        val dailyReportMailAttachmentSlot = slot<List<MailAttachment>>()
        verify {
            mailSenderService.sendMail(
                any(),
                dailyReportMailSubject,
                dailyReportMailText,
                capture(dailyReportMailAttachmentSlot)
            )
        }

        val dailyReportAttachmentList = dailyReportMailAttachmentSlot.captured
        assertThat(dailyReportAttachmentList).hasSize(1)

        val dailyReportAttachment = dailyReportAttachmentList[0]
        assertThat(dailyReportAttachment.filename).isEqualTo("tagesreport_${dateFormatted}.pdf")
        assertThat(dailyReportAttachment.inputStreamSource).isNotNull
        assertThat(dailyReportAttachment.contentType).isEqualTo("application/pdf")
    }

    private fun assertStatisticFile(
        distributionStatistic: DistributionStatisticEntity
    ) {
        verify { statisticExportService.exportStatisticZipFile(distributionStatistic) }

        val statisticExportMailSubject =
            "TÖ Tafel 1030 - Statistiken vom ${LocalDate.now().format(DateTimeFormatter.ofPattern("dd.MM.yyyy"))}"
        val statisticExportMailText = "Details im Anhang"

        val statisticExportMailAttachmentSlot = slot<List<MailAttachment>>()
        verify {
            mailSenderService.sendMail(
                any(),
                statisticExportMailSubject,
                statisticExportMailText,
                capture(statisticExportMailAttachmentSlot)
            )
        }

        val statisticExportAttachmentList = statisticExportMailAttachmentSlot.captured
        assertThat(statisticExportAttachmentList).hasSize(1)

        val statisticZipFileAttachment = statisticExportAttachmentList[0]
        assertThat(statisticZipFileAttachment.filename).isEqualTo("statistics.zip")
        assertThat(statisticZipFileAttachment.inputStreamSource).isNotNull
        assertThat(statisticZipFileAttachment.contentType).isEqualTo("application/zip")

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

        // still sends statistic files
        verify { statisticExportService.exportStatisticZipFile(distributionStatistic) }
        val statisticExportMailSubject =
            "TÖ Tafel 1030 - Statistiken vom ${LocalDate.now().format(DateTimeFormatter.ofPattern("dd.MM.yyyy"))}"
        verify(exactly = 1) { mailSenderService.sendMail(any(), statisticExportMailSubject, any(), any()) }
    }

}
