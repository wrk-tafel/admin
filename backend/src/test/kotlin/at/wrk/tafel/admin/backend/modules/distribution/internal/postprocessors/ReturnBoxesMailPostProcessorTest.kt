package at.wrk.tafel.admin.backend.modules.distribution.internal.postprocessors

import at.wrk.tafel.admin.backend.common.mail.MailSenderService
import at.wrk.tafel.admin.backend.config.properties.TafelAdminProperties
import at.wrk.tafel.admin.backend.database.model.distribution.DistributionEntity
import at.wrk.tafel.admin.backend.database.model.distribution.DistributionStatisticEntity
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
import org.thymeleaf.context.Context
import java.time.LocalDate
import java.time.LocalDateTime
import java.time.format.DateTimeFormatter

@ExtendWith(MockKExtension::class)
class ReturnBoxesMailPostProcessorTest {

    @RelaxedMockK
    private lateinit var tafelAdminProperties: TafelAdminProperties

    @RelaxedMockK
    private lateinit var mailSenderService: MailSenderService

    @InjectMockKs
    private lateinit var postProcessor: ReturnBoxesMailPostProcessor

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
        postProcessor.process(distribution, distributionStatistic)

        assertMail()
    }

    private fun assertMail() {
        val mailSubject =
            "TÖ Tafel 1030 - Retourkisten vom ${LocalDate.now().format(DateTimeFormatter.ofPattern("dd.MM.yyyy"))}"

        val contextSlot = slot<Context>()
        verify {
            mailSenderService.sendHtmlMail(
                tafelAdminProperties.mail!!.returnBoxes!!,
                mailSubject,
                emptyList(),
                "mails/return-boxes-mail",
                capture(contextSlot)
            )
        }

        val context = contextSlot.captured
        assertThat(context.getVariable("distributionDate")).isEqualTo(
            LocalDateTime.now().format(DateTimeFormatter.ofPattern("dd.MM.yyyy"))
        )

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
    }

}
