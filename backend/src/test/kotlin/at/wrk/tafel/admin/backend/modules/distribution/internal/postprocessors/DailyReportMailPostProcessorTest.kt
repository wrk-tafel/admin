package at.wrk.tafel.admin.backend.modules.distribution.internal.postprocessors

import at.wrk.tafel.admin.backend.common.mail.MailAttachment
import at.wrk.tafel.admin.backend.common.mail.MailSenderService
import at.wrk.tafel.admin.backend.database.model.base.MailType
import at.wrk.tafel.admin.backend.database.model.distribution.DistributionEntity
import at.wrk.tafel.admin.backend.database.model.distribution.DistributionStatisticEntity
import at.wrk.tafel.admin.backend.modules.distribution.internal.testDistributionCustomerEntity1
import at.wrk.tafel.admin.backend.modules.distribution.internal.testDistributionCustomerEntity2
import at.wrk.tafel.admin.backend.modules.reporting.DailyReportService
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
import org.thymeleaf.context.Context
import java.time.LocalDateTime
import java.time.format.DateTimeFormatter

@ExtendWith(MockKExtension::class)
class DailyReportMailPostProcessorTest {

    @RelaxedMockK
    private lateinit var dailyReportService: DailyReportService

    @RelaxedMockK
    private lateinit var mailSenderService: MailSenderService

    @InjectMockKs
    private lateinit var postProcessor: DailyReportMailPostProcessor

    @Test
    fun `proper postprocessing done`() {
        val distributionStartDate = LocalDateTime.now().minusDays(7)
        val dateFormatted = distributionStartDate.format(DateTimeFormatter.ofPattern("dd.MM.yyyy"))
        val dateFilename = distributionStartDate.format(DateTimeFormatter.ofPattern("ddMMyyyy"))

        val distributionId = 123L
        val distributionNotes = "test notes"

        val distribution = mockk<DistributionEntity>()
        every { distribution.id } returns distributionId
        every { distribution.startedAt } returns distributionStartDate
        every { distribution.notes } returns distributionNotes
        every { distribution.customers } returns listOf(
            testDistributionCustomerEntity1,
            testDistributionCustomerEntity2
        )
        val distributionStatistic = mockk<DistributionStatisticEntity>()

        val pdfBytes = ByteArray(10)
        every { dailyReportService.generateDailyReportPdf(any()) } returns pdfBytes

        postProcessor.process(distribution, distributionStatistic)

        assertMail(distributionStatistic, dateFormatted, dateFilename)
    }

    @Test
    fun `process skips report and generation and sending email without customers`() {
        val distributionId = 123L
        val distribution = mockk<DistributionEntity>()
        every { distribution.id } returns distributionId
        every { distribution.customers } returns emptyList()

        val distributionStatistic = mockk<DistributionStatisticEntity>()

        postProcessor.process(distribution, distributionStatistic)

        verify(exactly = 0) { dailyReportService.generateDailyReportPdf(distributionStatistic) }
    }

    private fun assertMail(
        distributionStatistic: DistributionStatisticEntity,
        dateFormatted: String,
        dateFilename: String,
    ) {
        verify { dailyReportService.generateDailyReportPdf(distributionStatistic) }

        val dailyReportMailSubject =
            "TÖ Tafel 1030 - Tagesreport vom $dateFormatted"

        val contextSlot = slot<Context>()

        val dailyReportMailAttachmentSlot = slot<List<MailAttachment>>()
        verify {
            mailSenderService.sendHtmlMail(
                mailType = MailType.DAILY_REPORT,
                subject = dailyReportMailSubject,
                attachments = capture(dailyReportMailAttachmentSlot),
                templateName = "mails/daily-report-mail",
                context = capture(contextSlot)
            )
        }

        val context = contextSlot.captured
        assertThat(context.getVariable("distributionDate")).isEqualTo(dateFormatted)
        assertThat(context.getVariable("notes")).isEqualTo("test notes")

        val dailyReportAttachmentList = dailyReportMailAttachmentSlot.captured
        assertThat(dailyReportAttachmentList).hasSize(1)

        val dailyReportAttachment = dailyReportAttachmentList[0]
        assertThat(dailyReportAttachment.filename).isEqualTo("tagesreport_${dateFilename}.pdf")
        assertThat(dailyReportAttachment.inputStreamSource).isNotNull
        assertThat(dailyReportAttachment.contentType).isEqualTo("application/pdf")
    }

}
