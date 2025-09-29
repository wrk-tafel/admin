package at.wrk.tafel.admin.backend.modules.distribution.internal.postprocessors

import at.wrk.tafel.admin.backend.common.mail.MailAttachment
import at.wrk.tafel.admin.backend.common.mail.MailSenderService
import at.wrk.tafel.admin.backend.database.model.base.MailType
import at.wrk.tafel.admin.backend.database.model.distribution.DistributionEntity
import at.wrk.tafel.admin.backend.database.model.distribution.DistributionStatisticEntity
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
import org.thymeleaf.context.Context
import java.time.LocalDateTime
import java.time.format.DateTimeFormatter

@ExtendWith(MockKExtension::class)
class StatisticMailPostProcessorTest {

    @RelaxedMockK
    private lateinit var mailSenderService: MailSenderService

    @RelaxedMockK
    private lateinit var statisticExportService: StatisticExportService

    @InjectMockKs
    private lateinit var postProcessor: StatisticMailPostProcessor

    @Test
    fun `proper postprocessing done`() {
        val distributionId = 123L
        val distributionStartDate = LocalDateTime.now().minusDays(7)
        val dateFormatted = distributionStartDate.format(DateTimeFormatter.ofPattern("dd.MM.yyyy"))

        val distribution = mockk<DistributionEntity>()
        every { distribution.id } returns distributionId
        every { distribution.startedAt } returns distributionStartDate
        val distributionStatistic = mockk<DistributionStatisticEntity>()

        every { statisticExportService.exportStatisticFiles(any()) } returns listOf(
            StatisticExportFile("file1.csv", ByteArray(10)),
        )

        postProcessor.process(distribution, distributionStatistic)

        assertStatisticExportFiles(distributionStatistic, dateFormatted)
    }

    private fun assertStatisticExportFiles(
        distributionStatistic: DistributionStatisticEntity,
        dateFormatted: String
    ) {
        verify { statisticExportService.exportStatisticFiles(distributionStatistic) }

        val statisticExportMailSubject =
            "TÖ Tafel 1030 - Statistiken vom $dateFormatted"

        val statisticExportMailAttachmentSlot = slot<List<MailAttachment>>()
        val contextSlot = slot<Context>()
        verify {
            mailSenderService.sendHtmlMail(
                mailType = MailType.STATISTICS,
                subject = statisticExportMailSubject,
                attachments = capture(statisticExportMailAttachmentSlot),
                templateName = "mails/statistic-mail",
                context = capture(contextSlot)
            )
        }

        val context = contextSlot.captured
        assertThat(context.getVariable("distributionDate")).isEqualTo(dateFormatted)

        val statisticExportAttachmentList = statisticExportMailAttachmentSlot.captured
        assertThat(statisticExportAttachmentList).hasSize(1)

        val statisticZipFileAttachment = statisticExportAttachmentList[0]
        assertThat(statisticZipFileAttachment.filename).isEqualTo("file1.csv")
        assertThat(statisticZipFileAttachment.inputStreamSource).isNotNull
        assertThat(statisticZipFileAttachment.contentType).isEqualTo("text/csv")
    }

}
