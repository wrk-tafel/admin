package at.wrk.tafel.admin.backend.modules.distribution.internal.postprocessors

import at.wrk.tafel.admin.backend.common.mail.MailAttachment
import at.wrk.tafel.admin.backend.common.mail.MailSenderService
import at.wrk.tafel.admin.backend.config.properties.TafelAdminProperties
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
import java.time.LocalDate
import java.time.format.DateTimeFormatter

@ExtendWith(MockKExtension::class)
class StatisticMailPostProcessorTest {

    @RelaxedMockK
    private lateinit var tafelAdminProperties: TafelAdminProperties

    @RelaxedMockK
    private lateinit var mailSenderService: MailSenderService

    @RelaxedMockK
    private lateinit var statisticExportService: StatisticExportService

    @InjectMockKs
    private lateinit var postProcessor: StatisticMailPostProcessor

    @Test
    fun `proper postprocessing done`() {
        val distributionId = 123L
        val distribution = mockk<DistributionEntity>()
        every { distribution.id } returns distributionId
        val distributionStatistic = mockk<DistributionStatisticEntity>()

        every { statisticExportService.exportStatisticFiles(any()) } returns listOf(
            StatisticExportFile("file1.csv", ByteArray(10)),
        )

        postProcessor.process(distribution, distributionStatistic)

        assertStatisticExportFiles(distributionStatistic)
    }

    private fun assertStatisticExportFiles(
        distributionStatistic: DistributionStatisticEntity,
    ) {
        verify { statisticExportService.exportStatisticFiles(distributionStatistic) }

        val statisticExportMailSubject =
            "TÖ Tafel 1030 - Statistiken vom ${LocalDate.now().format(DateTimeFormatter.ofPattern("dd.MM.yyyy"))}"
        val statisticExportMailText = "Details im Anhang"

        val statisticExportMailAttachmentSlot = slot<List<MailAttachment>>()
        verify {
            mailSenderService.sendMail(
                tafelAdminProperties.mail!!.statistic!!,
                statisticExportMailSubject,
                statisticExportMailText,
                capture(statisticExportMailAttachmentSlot)
            )
        }

        val statisticExportAttachmentList = statisticExportMailAttachmentSlot.captured
        assertThat(statisticExportAttachmentList).hasSize(1)

        val statisticZipFileAttachment = statisticExportAttachmentList[0]
        assertThat(statisticZipFileAttachment.filename).isEqualTo("file1.csv")
        assertThat(statisticZipFileAttachment.inputStreamSource).isNotNull
        assertThat(statisticZipFileAttachment.contentType).isEqualTo("text/csv")
    }

}
