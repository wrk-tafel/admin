package at.wrk.tafel.admin.backend.modules.distribution.internal.postprocessors

import at.wrk.tafel.admin.backend.common.mail.MailSenderService
import at.wrk.tafel.admin.backend.database.model.base.MailType
import at.wrk.tafel.admin.backend.database.model.distribution.DistributionEntity
import at.wrk.tafel.admin.backend.database.model.distribution.DistributionStatisticEntity
import at.wrk.tafel.admin.backend.modules.logistics.testFoodCollectionRoute1Entity
import at.wrk.tafel.admin.backend.modules.logistics.testFoodCollectionRoute2Entity
import at.wrk.tafel.admin.backend.modules.logistics.testFoodCollectionRoute3Entity
import at.wrk.tafel.admin.backend.modules.logistics.testFoodCollectionRoute4Entity
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
class ReturnBoxesMailPostProcessorTest {

    @RelaxedMockK
    private lateinit var mailSenderService: MailSenderService

    @InjectMockKs
    private lateinit var postProcessor: ReturnBoxesMailPostProcessor

    @Test
    fun `proper postprocessing done`() {
        val distributionId = 123L
        val distributionNotes = "Test note 123, no problems, everything easy"
        val distributionStartDate = LocalDateTime.now().minusDays(7)
        val dateFormatted = distributionStartDate.format(DateTimeFormatter.ofPattern("dd.MM.yyyy"))

        val distribution = mockk<DistributionEntity>()
        every { distribution.id } returns distributionId
        every { distribution.startedAt } returns distributionStartDate
        every { distribution.notes } returns distributionNotes
        every { distribution.foodCollections } returns listOf(
            testFoodCollectionRoute1Entity,
            testFoodCollectionRoute2Entity,
            testFoodCollectionRoute3Entity,
            testFoodCollectionRoute4Entity
        )

        val distributionStatistic = mockk<DistributionStatisticEntity>()
        postProcessor.process(distribution, distributionStatistic)

        assertMail(dateFormatted)
    }

    private fun assertMail(dateFormatted: String) {
        val mailSubject =
            "TÖ Tafel 1030 - Retourkisten vom $dateFormatted"

        val contextSlot = slot<Context>()
        verify {
            mailSenderService.sendHtmlMail(
                mailType = MailType.RETURN_BOXES,
                subject = mailSubject,
                attachments = emptyList(),
                templateName = "mails/return-boxes-mail",
                context = capture(contextSlot)
            )
        }

        val context = contextSlot.captured
        assertThat(context.getVariable("distributionDate")).isEqualTo(dateFormatted)

        val returnBoxes = context.getVariable("returnBoxes") as ReturnBoxesDataModel
        assertThat(returnBoxes.routes).hasSize(2)

        val firstReturnBox = returnBoxes.routes.first()
        assertThat(firstReturnBox).isEqualTo(
            ReturnBoxesRoute(
                name = "Route 1",
                shops = listOf(
                    ReturnBoxesShop(
                        name = "2 Hofer",
                        address = "Street 1, 1234, City",
                        returnBoxes = "4x Category 2"
                    )
                )
            )
        )

        val secondReturnBox = returnBoxes.routes[1]
        assertThat(secondReturnBox).isEqualTo(
            ReturnBoxesRoute(
                name = "Route 2",
                shops = listOf(
                    ReturnBoxesShop(
                        name = "3 Hofer 2",
                        address = "Street 1, 1234, City",
                        returnBoxes = "5x Category 2"
                    )
                )
            )
        )
    }

}
