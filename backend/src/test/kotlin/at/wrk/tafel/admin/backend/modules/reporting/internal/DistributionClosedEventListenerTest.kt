package at.wrk.tafel.admin.backend.modules.reporting.internal

import at.wrk.tafel.admin.backend.common.mail.MailAttachment
import at.wrk.tafel.admin.backend.common.mail.MailSenderService
import at.wrk.tafel.admin.backend.database.model.base.MailType
import at.wrk.tafel.admin.backend.database.model.distribution.DistributionEntity
import at.wrk.tafel.admin.backend.database.model.distribution.DistributionRepository
import at.wrk.tafel.admin.backend.database.model.distribution.DistributionStatisticEntity
import at.wrk.tafel.admin.backend.database.model.logistics.FoodReturnCategoryRepository
import at.wrk.tafel.admin.backend.modules.distribution.DistributionClosedEvent
import at.wrk.tafel.admin.backend.modules.distribution.internal.testDistributionHouseholdEntity1
import at.wrk.tafel.admin.backend.modules.distribution.internal.testDistributionHouseholdEntity2
import at.wrk.tafel.admin.backend.modules.logistics.testFoodCollectionRoute1Entity
import at.wrk.tafel.admin.backend.modules.logistics.testFoodCollectionRoute2Entity
import at.wrk.tafel.admin.backend.modules.logistics.testFoodCollectionRoute3Entity
import at.wrk.tafel.admin.backend.modules.logistics.testFoodCollectionRoute4Entity
import at.wrk.tafel.admin.backend.modules.reporting.DailyReportService
import at.wrk.tafel.admin.backend.modules.reporting.StatisticExportFile
import at.wrk.tafel.admin.backend.modules.reporting.StatisticExportService
import io.mockk.every
import io.mockk.impl.annotations.RelaxedMockK
import io.mockk.junit5.MockKExtension
import io.mockk.mockk
import io.mockk.slot
import io.mockk.verify
import org.assertj.core.api.Assertions.assertThat
import org.junit.jupiter.api.BeforeEach
import org.junit.jupiter.api.Test
import org.junit.jupiter.api.assertThrows
import org.junit.jupiter.api.extension.ExtendWith
import org.springframework.data.repository.findByIdOrNull
import org.springframework.retry.support.RetryTemplate
import org.thymeleaf.context.Context
import java.time.LocalDateTime
import java.time.format.DateTimeFormatter

@ExtendWith(MockKExtension::class)
class DistributionClosedEventListenerTest {

    @RelaxedMockK
    private lateinit var distributionRepository: DistributionRepository

    @RelaxedMockK
    private lateinit var foodReturnCategoryRepository: FoodReturnCategoryRepository

    @RelaxedMockK
    private lateinit var dailyReportService: DailyReportService

    @RelaxedMockK
    private lateinit var statisticExportService: StatisticExportService

    @RelaxedMockK
    private lateinit var mailSenderService: MailSenderService

    private lateinit var listener: DistributionClosedEventListener

    @BeforeEach
    fun beforeEach() {
        // Real RetryTemplate (not mocked) with no backoff, so retry/isolation behavior is genuinely
        // exercised without slowing the test down with real waits between attempts.
        val retryTemplate = RetryTemplate.builder()
            .maxAttempts(3)
            .noBackoff()
            .retryOn(Exception::class.java)
            .build()

        listener = DistributionClosedEventListener(
            distributionRepository,
            foodReturnCategoryRepository,
            dailyReportService,
            statisticExportService,
            mailSenderService,
            retryTemplate,
        )
    }

    @Test
    fun `sends daily report, statistic and return boxes mails`() {
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
        every { distribution.foodCollections } returns listOf(
            testFoodCollectionRoute1Entity,
            testFoodCollectionRoute2Entity,
            testFoodCollectionRoute3Entity,
            testFoodCollectionRoute4Entity,
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

        val returnBoxesMailSubject = "TÖ Tafel 1030 - Retourkisten vom $dateFormatted"
        val returnBoxesContextSlot = slot<Context>()
        verify {
            mailSenderService.sendHtmlMail(
                mailType = MailType.RETURN_BOXES,
                subject = returnBoxesMailSubject,
                attachments = emptyList(),
                templateName = "mails/return-boxes-mail",
                context = capture(returnBoxesContextSlot),
            )
        }
        val returnBoxesContext = returnBoxesContextSlot.captured
        assertThat(returnBoxesContext.getVariable("distributionDate")).isEqualTo(dateFormatted)
        assertThat(returnBoxesContext.getVariable("notes")).isEqualTo(distributionNotes)

        val returnBoxes = returnBoxesContext.getVariable("returnBoxes") as ReturnBoxesDataModel
        assertThat(returnBoxes.routes).hasSize(2)

        val firstReturnBox = returnBoxes.routes.first()
        assertThat(firstReturnBox).isEqualTo(
            ReturnBoxesRoute(
                name = "Route 1",
                shops = listOf(
                    ReturnBoxesShop(
                        name = "1 Billa",
                        address = "Street 1, 1234, City",
                        returnBoxes = "3x Graue Kisten",
                    ),
                    ReturnBoxesShop(
                        name = "2 Hofer",
                        address = "Street 1, 1234, City",
                        returnBoxes = "1x Bananenkartons",
                    ),
                ),
            ),
        )

        val secondReturnBox = returnBoxes.routes[1]
        assertThat(secondReturnBox).isEqualTo(
            ReturnBoxesRoute(
                name = "Route 2",
                shops = listOf(
                    ReturnBoxesShop(
                        name = "3 Hofer 2",
                        address = "Street 1, 1234, City",
                        returnBoxes = "2x Klappkisten schwarz",
                    ),
                ),
            ),
        )
    }

    @Test
    fun `skips daily report but still sends statistic and return boxes mails without customers`() {
        val distributionId = 123L
        val distributionStatistic = mockk<DistributionStatisticEntity>()

        val distribution = mockk<DistributionEntity>()
        every { distribution.id } returns distributionId
        every { distribution.startedAt } returns LocalDateTime.now()
        every { distribution.notes } returns null
        every { distribution.statistic } returns distributionStatistic
        every { distribution.households } returns emptyList()
        every { distribution.foodCollections } returns emptyList()

        every { distributionRepository.findByIdOrNull(distributionId) } returns distribution
        every { statisticExportService.exportStatisticFiles(distributionStatistic) } returns emptyList()

        listener.onDistributionClosed(DistributionClosedEvent(distributionId))

        verify(exactly = 0) { dailyReportService.generateDailyReportPdf(any()) }
        verify { statisticExportService.exportStatisticFiles(distributionStatistic) }
        verify { mailSenderService.sendHtmlMail(mailType = MailType.RETURN_BOXES, subject = any(), attachments = any(), templateName = any(), context = any()) }
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

    @Test
    fun `retries daily report mail on transient failure and succeeds without failing the whole listener`() {
        val (distributionId, distribution, distributionStatistic) = setupDistribution()

        every { dailyReportService.generateDailyReportPdf(distributionStatistic) } throws
            IllegalStateException("transient failure") andThenThrows
            IllegalStateException("transient failure") andThen ByteArray(10)
        every { statisticExportService.exportStatisticFiles(distributionStatistic) } returns emptyList()

        listener.onDistributionClosed(DistributionClosedEvent(distributionId))

        verify(exactly = 3) { dailyReportService.generateDailyReportPdf(distributionStatistic) }
        verify { mailSenderService.sendHtmlMail(MailType.DAILY_REPORT, any(), any(), any(), any()) }
        verify { statisticExportService.exportStatisticFiles(distributionStatistic) }
        verify { mailSenderService.sendHtmlMail(mailType = MailType.RETURN_BOXES, subject = any(), attachments = any(), templateName = any(), context = any()) }
    }

    @Test
    fun `still sends statistic and return boxes mail after daily report mail exhausts all retries, then rethrows`() {
        val (distributionId, distribution, distributionStatistic) = setupDistribution()

        every { dailyReportService.generateDailyReportPdf(distributionStatistic) } throws
            IllegalStateException("permanent failure")
        every { statisticExportService.exportStatisticFiles(distributionStatistic) } returns listOf(
            StatisticExportFile("file1.csv", ByteArray(10)),
        )

        val exception = assertThrows<IllegalStateException> {
            listener.onDistributionClosed(DistributionClosedEvent(distributionId))
        }

        assertThat(exception.message).isEqualTo("permanent failure")
        verify(exactly = 3) { dailyReportService.generateDailyReportPdf(distributionStatistic) }
        verify { statisticExportService.exportStatisticFiles(distributionStatistic) }
        verify { mailSenderService.sendHtmlMail(mailType = MailType.STATISTICS, subject = any(), attachments = any(), templateName = any(), context = any()) }
        verify { mailSenderService.sendHtmlMail(mailType = MailType.RETURN_BOXES, subject = any(), attachments = any(), templateName = any(), context = any()) }
    }

    @Test
    fun `still attempts daily report and return boxes mail after statistic mail exhausts all retries, then rethrows`() {
        val (distributionId, distribution, distributionStatistic) = setupDistribution()

        every { dailyReportService.generateDailyReportPdf(distributionStatistic) } returns ByteArray(10)
        every { statisticExportService.exportStatisticFiles(distributionStatistic) } throws
            IllegalStateException("permanent failure")

        val exception = assertThrows<IllegalStateException> {
            listener.onDistributionClosed(DistributionClosedEvent(distributionId))
        }

        assertThat(exception.message).isEqualTo("permanent failure")
        verify(exactly = 3) { statisticExportService.exportStatisticFiles(distributionStatistic) }
        verify { mailSenderService.sendHtmlMail(MailType.DAILY_REPORT, any(), any(), any(), any()) }
        verify { mailSenderService.sendHtmlMail(mailType = MailType.RETURN_BOXES, subject = any(), attachments = any(), templateName = any(), context = any()) }
    }

    @Test
    fun `still attempts daily report and statistic mail after return boxes mail exhausts all retries, then rethrows`() {
        val (distributionId, distribution, distributionStatistic) = setupDistribution()

        every { dailyReportService.generateDailyReportPdf(distributionStatistic) } returns ByteArray(10)
        every { statisticExportService.exportStatisticFiles(distributionStatistic) } returns emptyList()
        every { mailSenderService.sendHtmlMail(MailType.RETURN_BOXES, any(), any(), any(), any()) } throws
            IllegalStateException("permanent failure")

        val exception = assertThrows<IllegalStateException> {
            listener.onDistributionClosed(DistributionClosedEvent(distributionId))
        }

        assertThat(exception.message).isEqualTo("permanent failure")
        verify(exactly = 3) { mailSenderService.sendHtmlMail(MailType.RETURN_BOXES, any(), any(), any(), any()) }
        verify { mailSenderService.sendHtmlMail(MailType.DAILY_REPORT, any(), any(), any(), any()) }
        verify { mailSenderService.sendHtmlMail(mailType = MailType.STATISTICS, subject = any(), attachments = any(), templateName = any(), context = any()) }
    }

    @Test
    fun `rethrows first failure with others attached as suppressed when all mails fail after retries`() {
        val (distributionId, distribution, distributionStatistic) = setupDistribution()

        every { dailyReportService.generateDailyReportPdf(distributionStatistic) } throws
            IllegalStateException("daily report failure")
        every { statisticExportService.exportStatisticFiles(distributionStatistic) } throws
            IllegalStateException("statistic failure")
        every { mailSenderService.sendHtmlMail(MailType.RETURN_BOXES, any(), any(), any(), any()) } throws
            IllegalStateException("return boxes failure")

        val exception = assertThrows<IllegalStateException> {
            listener.onDistributionClosed(DistributionClosedEvent(distributionId))
        }

        assertThat(exception.message).isEqualTo("daily report failure")
        assertThat(exception.suppressed).hasSize(2)
        assertThat(exception.suppressed[0].message).isEqualTo("statistic failure")
        assertThat(exception.suppressed[1].message).isEqualTo("return boxes failure")
        verify(exactly = 3) { dailyReportService.generateDailyReportPdf(distributionStatistic) }
        verify(exactly = 3) { statisticExportService.exportStatisticFiles(distributionStatistic) }
        verify(exactly = 3) { mailSenderService.sendHtmlMail(MailType.RETURN_BOXES, any(), any(), any(), any()) }
    }

    private fun setupDistribution(): Triple<Long, DistributionEntity, DistributionStatisticEntity> {
        val distributionId = 123L
        val distributionStatistic = mockk<DistributionStatisticEntity>()

        val distribution = mockk<DistributionEntity>()
        every { distribution.id } returns distributionId
        every { distribution.startedAt } returns LocalDateTime.now().minusDays(7)
        every { distribution.notes } returns null
        every { distribution.statistic } returns distributionStatistic
        every { distribution.households } returns listOf(
            testDistributionHouseholdEntity1,
            testDistributionHouseholdEntity2,
        )
        every { distribution.foodCollections } returns emptyList()

        every { distributionRepository.findByIdOrNull(distributionId) } returns distribution

        return Triple(distributionId, distribution, distributionStatistic)
    }
}
