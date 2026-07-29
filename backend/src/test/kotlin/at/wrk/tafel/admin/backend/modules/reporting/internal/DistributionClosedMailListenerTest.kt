package at.wrk.tafel.admin.backend.modules.reporting.internal

import at.wrk.tafel.admin.backend.common.mail.MailAttachment
import at.wrk.tafel.admin.backend.common.mail.MailSenderService
import at.wrk.tafel.admin.backend.database.model.base.MailType
import at.wrk.tafel.admin.backend.database.model.distribution.DistributionEntity
import at.wrk.tafel.admin.backend.database.model.distribution.DistributionRepository
import at.wrk.tafel.admin.backend.database.model.distribution.DistributionStatisticEntity
import at.wrk.tafel.admin.backend.modules.distribution.DistributionClosedEvent
import at.wrk.tafel.admin.backend.modules.distribution.internal.testDistributionHouseholdEntity1
import at.wrk.tafel.admin.backend.modules.distribution.internal.testDistributionHouseholdEntity2
import at.wrk.tafel.admin.backend.modules.reporting.DailyReportService
import at.wrk.tafel.admin.backend.modules.reporting.StatisticExportFile
import at.wrk.tafel.admin.backend.modules.reporting.StatisticExportService
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
import org.springframework.data.repository.findByIdOrNull
import org.thymeleaf.context.Context
import java.time.LocalDateTime
import java.time.format.DateTimeFormatter

@ExtendWith(MockKExtension::class)
class DistributionClosedMailListenerTest {

    @RelaxedMockK
    private lateinit var distributionRepository: DistributionRepository

    @RelaxedMockK
    private lateinit var dailyReportService: DailyReportService

    @RelaxedMockK
    private lateinit var statisticExportService: StatisticExportService

    @RelaxedMockK
    private lateinit var mailSenderService: MailSenderService

    @InjectMockKs
    private lateinit var listener: DistributionClosedMailListener

    @Test
    fun `sends daily report and statistic mails`() {
        val distributionId = 123L
        val distributionStartDate = LocalDateTime.now().minusDays(7)
        val dateFormatted = distributionStartDate.format(DateTimeFormatter.ofPattern("dd.MM.yyyy"))
        val dateFilename = distributionStartDate.format(DateTimeFormatter.ofPattern("ddMMyyyy"))
        val distributionNotes = "test notes"

        val distributionStatistic = mockk<DistributionStatisticEntity>()

        val distribution = mockk<DistributionEntity>()
        every { distribution.id } returns distributionId
        every { distribution.startedAt } returns distributionStartDate
        every { distribution.notes } returns distributionNotes
        every { distribution.statistic } returns distributionStatistic
        every { distribution.households } returns listOf(
            testDistributionHouseholdEntity1,
            testDistributionHouseholdEntity2,
        )

        every { distributionRepository.findByIdOrNull(distributionId) } returns distribution

        val pdfBytes = ByteArray(10)
        every { dailyReportService.generateDailyReportPdf(distributionStatistic) } returns pdfBytes
        every { statisticExportService.exportStatisticFiles(distributionStatistic) } returns listOf(
            StatisticExportFile("file1.csv", ByteArray(10)),
        )

        listener.onDistributionClosed(DistributionClosedEvent(distributionId))

        val dailyReportMailSubject = "TÖ Tafel 1030 - Tagesreport vom $dateFormatted"
        val dailyReportContextSlot = slot<Context>()
        val dailyReportAttachmentSlot = slot<List<MailAttachment>>()
        verify {
            mailSenderService.sendHtmlMail(
                MailType.DAILY_REPORT,
                dailyReportMailSubject,
                capture(dailyReportAttachmentSlot),
                "mails/daily-report-mail",
                capture(dailyReportContextSlot),
            )
        }
        assertThat(dailyReportContextSlot.captured.getVariable("distributionDate")).isEqualTo(dateFormatted)
        assertThat(dailyReportContextSlot.captured.getVariable("notes")).isEqualTo(distributionNotes)
        assertThat(dailyReportAttachmentSlot.captured).hasSize(1)
        assertThat(dailyReportAttachmentSlot.captured[0].filename).isEqualTo("tagesreport_$dateFilename.pdf")

        val statisticMailSubject = "TÖ Tafel 1030 - Statistiken vom $dateFormatted"
        val statisticContextSlot = slot<Context>()
        val statisticAttachmentSlot = slot<List<MailAttachment>>()
        verify {
            mailSenderService.sendHtmlMail(
                mailType = MailType.STATISTICS,
                subject = statisticMailSubject,
                attachments = capture(statisticAttachmentSlot),
                templateName = "mails/statistic-mail",
                context = capture(statisticContextSlot),
            )
        }
        assertThat(statisticContextSlot.captured.getVariable("distributionDate")).isEqualTo(dateFormatted)
        assertThat(statisticAttachmentSlot.captured).hasSize(1)
        assertThat(statisticAttachmentSlot.captured[0].filename).isEqualTo("file1.csv")
    }

    @Test
    fun `skips daily report but still sends statistic mail without customers`() {
        val distributionId = 123L
        val distributionStatistic = mockk<DistributionStatisticEntity>()

        val distribution = mockk<DistributionEntity>()
        every { distribution.id } returns distributionId
        every { distribution.startedAt } returns LocalDateTime.now()
        every { distribution.statistic } returns distributionStatistic
        every { distribution.households } returns emptyList()

        every { distributionRepository.findByIdOrNull(distributionId) } returns distribution
        every { statisticExportService.exportStatisticFiles(distributionStatistic) } returns emptyList()

        listener.onDistributionClosed(DistributionClosedEvent(distributionId))

        verify(exactly = 0) { dailyReportService.generateDailyReportPdf(any()) }
        verify { statisticExportService.exportStatisticFiles(distributionStatistic) }
    }

    @Test
    fun `does nothing when distribution not found`() {
        val distributionId = 123L
        every { distributionRepository.findByIdOrNull(distributionId) } returns null

        listener.onDistributionClosed(DistributionClosedEvent(distributionId))

        verify(exactly = 0) { dailyReportService.generateDailyReportPdf(any()) }
        verify(exactly = 0) { statisticExportService.exportStatisticFiles(any()) }
        verify(exactly = 0) { mailSenderService.sendHtmlMail(any(), any(), any(), any(), any()) }
    }
}
