package at.wrk.tafel.admin.backend.modules.distribution.internal.postprocessors

import at.wrk.tafel.admin.backend.common.mail.MailSenderService
import at.wrk.tafel.admin.backend.config.properties.TafelAdminProperties
import at.wrk.tafel.admin.backend.database.model.distribution.DistributionEntity
import at.wrk.tafel.admin.backend.database.model.distribution.DistributionStatisticEntity
import at.wrk.tafel.admin.backend.modules.logistics.testDistributionStatisticShelterEntity1
import at.wrk.tafel.admin.backend.modules.logistics.testDistributionStatisticShelterEntity2
import at.wrk.tafel.admin.backend.modules.logistics.testFoodCollectionRoute1Entity
import at.wrk.tafel.admin.backend.modules.logistics.testFoodCollectionRoute2Entity
import at.wrk.tafel.admin.backend.modules.logistics.testFoodCollectionRoute3Entity
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
import org.thymeleaf.TemplateEngine
import org.thymeleaf.context.Context
import java.time.LocalDate
import java.time.LocalDateTime
import java.time.format.DateTimeFormatter

@ExtendWith(MockKExtension::class)
class SummaryMailPostProcessorTest {

    @RelaxedMockK
    private lateinit var tafelAdminProperties: TafelAdminProperties

    @RelaxedMockK
    private lateinit var mailSenderService: MailSenderService

    @RelaxedMockK
    private lateinit var templateEngine: TemplateEngine

    @InjectMockKs
    private lateinit var postProcessor: SummaryMailPostProcessor

    // TODO add a rendering test (maybe as a seperate integration-test)

    @Test
    fun `proper postprocessing done`() {
        val distributionId = 123L
        val distributionNotes = "Test note 123, no problems, everything easy"

        val distribution = mockk<DistributionEntity>()
        every { distribution.id } returns distributionId
        every { distribution.startedAt } returns LocalDateTime.now()
        every { distribution.notes } returns distributionNotes
        every { distribution.foodCollections } returns listOf(
            testFoodCollectionRoute1Entity,
            testFoodCollectionRoute2Entity,
            testFoodCollectionRoute3Entity,
        )

        val distributionStatistic = mockk<DistributionStatisticEntity>()
        every { distributionStatistic.shelters } returns listOf(
            testDistributionStatisticShelterEntity1, testDistributionStatisticShelterEntity2
        ).toMutableList()

        postProcessor.process(distribution, distributionStatistic)

        assertSummaryMail(distribution, distributionStatistic)
    }

    private fun assertSummaryMail(
        distribution: DistributionEntity,
        distributionStatistic: DistributionStatisticEntity,
    ) {
        val mailSubject =
            "TÖ Tafel 1030 - Zusammenfassung vom ${LocalDate.now().format(DateTimeFormatter.ofPattern("dd.MM.yyyy"))}"
        val renderedMailContent = "rendered content"
        every { templateEngine.process("summary-mail.html", any()) } returns renderedMailContent

        val contextSlot = slot<Context>()
        verify { templateEngine.process("summary-mail.html", capture(contextSlot)) }

        val context = contextSlot.captured
        assertThat(context.getVariable("distributionDate")).isEqualTo(
            LocalDateTime.now().format(DateTimeFormatter.ofPattern("dd.MM.yyyy"))
        )
        assertThat(context.getVariable("notes")).isEqualTo(distribution.notes)

        val returnBoxes = context.getVariable("returnBoxes") as ReturnBoxesDataModel
        val firstReturnBox = returnBoxes.routes.first()
        assertThat(firstReturnBox).isEqualTo(
            ReturnBoxesRoute(
                name = "Route 1",
                shops = listOf(
                    ReturnBoxesShop(
                        name = "2 (Hofer)",
                        returnBoxes = "4x Category 2"
                    )
                )
            )
        )
        assertThat(context.getVariable("shelters") as List<*>).hasSameElementsAs(
            distributionStatistic.shelters.map { it.name }.sortedBy { it }
        )

        verify {
            mailSenderService.sendMail(
                tafelAdminProperties.mail!!.summaryMail!!,
                mailSubject,
                "", // TODO renderedMailContent
                emptyList(),
                true
            )
        }
    }

}
