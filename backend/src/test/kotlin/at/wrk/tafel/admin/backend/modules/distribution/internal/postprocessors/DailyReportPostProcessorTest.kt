package at.wrk.tafel.admin.backend.modules.distribution.internal.postprocessors

import at.wrk.tafel.admin.backend.common.mail.MailAttachment
import at.wrk.tafel.admin.backend.common.mail.MailSenderService
import at.wrk.tafel.admin.backend.config.properties.TafelAdminProperties
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
import java.time.LocalDate
import java.time.format.DateTimeFormatter

@ExtendWith(MockKExtension::class)
class DailyReportPostProcessorTest {

    @RelaxedMockK
    private lateinit var tafelAdminProperties: TafelAdminProperties

    @RelaxedMockK
    private lateinit var dailyReportService: DailyReportService

    @RelaxedMockK
    private lateinit var mailSenderService: MailSenderService

    @InjectMockKs
    private lateinit var postProcessor: DailyReportPostProcessor

    @Test
    fun `proper postprocessing done`() {
        val dateFormatted = LocalDate.now().format(DateTimeFormatter.ofPattern("ddMMyyyy"))

        val distributionId = 123L
        val distribution = mockk<DistributionEntity>()
        every { distribution.id } returns distributionId
        every { distribution.customers } returns listOf(
            testDistributionCustomerEntity1,
            testDistributionCustomerEntity2
        )
        val distributionStatistic = mockk<DistributionStatisticEntity>()

        val pdfBytes = ByteArray(10)
        every { dailyReportService.generateDailyReportPdf(any()) } returns pdfBytes

        postProcessor.process(distribution, distributionStatistic)

        assertDailyReport(distributionStatistic, dateFormatted)
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

    private fun assertDailyReport(
        distributionStatistic: DistributionStatisticEntity,
        dateFormatted: String,
    ) {
        verify { dailyReportService.generateDailyReportPdf(distributionStatistic) }

        val dailyReportMailSubject =
            "TÖ Tafel 1030 - Tages-Report vom ${LocalDate.now().format(DateTimeFormatter.ofPattern("dd.MM.yyyy"))}"
        val dailyReportMailText = "Details im Anhang"

        val dailyReportMailAttachmentSlot = slot<List<MailAttachment>>()
        verify {
            mailSenderService.sendMail(
                tafelAdminProperties.mail!!.dailyReport!!,
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

}
