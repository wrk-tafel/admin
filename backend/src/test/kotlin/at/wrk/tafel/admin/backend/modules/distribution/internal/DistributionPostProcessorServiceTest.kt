package at.wrk.tafel.admin.backend.modules.distribution.internal

import at.wrk.tafel.admin.backend.common.mail.MailAttachment
import at.wrk.tafel.admin.backend.common.mail.MailSenderService
import at.wrk.tafel.admin.backend.database.entities.distribution.DistributionEntity
import at.wrk.tafel.admin.backend.database.entities.distribution.DistributionStatisticEntity
import at.wrk.tafel.admin.backend.modules.distribution.internal.DistributionPostProcessorService
import at.wrk.tafel.admin.backend.modules.distribution.internal.statistic.DistributionStatisticService
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
internal class DistributionPostProcessorServiceTest {

    @RelaxedMockK
    private lateinit var distributionStatisticService: DistributionStatisticService

    @RelaxedMockK
    private lateinit var dailyReportService: DailyReportService

    @RelaxedMockK
    private lateinit var mailSenderService: MailSenderService

    @InjectMockKs
    private lateinit var service: DistributionPostProcessorService

    @Test
    fun `process calls proper services`() {
        val distribution = mockk<DistributionEntity>()
        val distributionStatistic = mockk<DistributionStatisticEntity>()
        every { distributionStatisticService.createAndSaveStatistic(distribution) } returns distributionStatistic

        val pdfBytes = ByteArray(10)
        every { dailyReportService.generateDailyReportPdf(any()) } returns pdfBytes

        service.process(distribution)

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
    }

}
