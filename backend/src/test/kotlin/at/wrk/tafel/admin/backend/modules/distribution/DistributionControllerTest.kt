package at.wrk.tafel.admin.backend.modules.distribution

import at.wrk.tafel.admin.backend.common.model.DistributionState
import at.wrk.tafel.admin.backend.database.entities.distribution.DistributionEntity
import at.wrk.tafel.admin.backend.modules.base.exception.TafelException
import at.wrk.tafel.admin.backend.modules.base.exception.TafelValidationException
import at.wrk.tafel.admin.backend.modules.distribution.model.*
import io.mockk.every
import io.mockk.impl.annotations.InjectMockKs
import io.mockk.impl.annotations.RelaxedMockK
import io.mockk.junit5.MockKExtension
import io.mockk.verify
import org.assertj.core.api.Assertions.assertThat
import org.junit.jupiter.api.Assertions.*
import org.junit.jupiter.api.Test
import org.junit.jupiter.api.assertThrows
import org.junit.jupiter.api.extension.ExtendWith
import org.springframework.http.HttpHeaders
import org.springframework.http.HttpStatus
import org.springframework.http.MediaType
import org.springframework.messaging.simp.SimpMessagingTemplate
import java.util.*

@ExtendWith(MockKExtension::class)
internal class DistributionControllerTest {

    @RelaxedMockK
    private lateinit var service: DistributionService

    @RelaxedMockK
    private lateinit var simpMessagingTemplate: SimpMessagingTemplate

    @InjectMockKs
    private lateinit var controller: DistributionController

    @Test
    fun `create new distribution`() {
        val distributionEntity = DistributionEntity()
        distributionEntity.id = 123
        distributionEntity.state = DistributionState.OPEN
        every { service.createNewDistribution() } returns distributionEntity

        controller.createNewDistribution()

        val distributionItemResponse = DistributionItemResponse(
            distribution = DistributionItem(
                id = distributionEntity.id!!,
                state = DistributionStateItem(
                    name = distributionEntity.state!!.name,
                    stateLabel = "Geöffnet",
                    actionLabel = "Anmeldung starten"
                )
            )
        )

        verify {
            simpMessagingTemplate.convertAndSend("/topic/distributions", distributionItemResponse)
        }
    }

    @Test
    fun `create new distribution with existing ongoing distribution`() {
        val message = "MSG"
        every { service.createNewDistribution() } throws TafelException(message)

        val exception = assertThrows(TafelException::class.java) {
            controller.createNewDistribution()
        }

        assertThat(exception.message).isEqualTo(message)
    }

    @Test
    fun `current distribution found`() {
        val distributionEntity = DistributionEntity()
        distributionEntity.id = 123
        distributionEntity.state = DistributionState.DISTRIBUTION
        every { service.getCurrentDistribution() } returns distributionEntity

        val response = controller.getCurrentDistribution()

        assertThat(response.distribution).isEqualTo(
            DistributionItem(
                id = distributionEntity.id!!,
                state = DistributionStateItem(
                    name = "DISTRIBUTION",
                    stateLabel = "Verteilung läuft",
                    actionLabel = "Ausgabe schließen"
                )
            )
        )
    }

    @Test
    fun `current distribution not found`() {
        every { service.getCurrentDistribution() } returns null

        val response = controller.getCurrentDistribution()

        assertThat(response.distribution).isNull()
    }

    @Test
    fun `get states`() {
        every { service.getStates() } returns listOf(DistributionState.OPEN, DistributionState.CLOSED)

        val response = controller.getDistributionStates()

        assertThat(response).isEqualTo(
            DistributionStatesResponse(
                states = listOf(
                    DistributionStateItem(
                        name = "OPEN",
                        stateLabel = "Geöffnet",
                        actionLabel = "Anmeldung starten"
                    ),
                    DistributionStateItem(
                        name = "CLOSED",
                        stateLabel = "Geschlossen",
                        actionLabel = null
                    )
                )
            )
        )
    }

    @Test
    fun `switch to next distribution state without open distribution`() {
        every { service.getCurrentDistribution() } returns null

        val exception = assertThrows<TafelValidationException> {
            controller.switchToNextDistributionState()
        }

        assertThat(exception.message).isEqualTo("Ausgabe nicht gestartet!")
    }

    @Test
    fun `switch to next distribution state with open distribution`() {
        val distributionEntity = DistributionEntity()
        distributionEntity.id = 123
        distributionEntity.state = DistributionState.DISTRIBUTION
        every { service.getCurrentDistribution() } returns distributionEntity

        val response = controller.switchToNextDistributionState()

        assertThat(response.statusCode).isEqualTo(HttpStatus.OK)
        assertThat(response.body).isNull()

        verify { service.switchToNextState(distributionEntity.state!!) }
        verify {
            simpMessagingTemplate.convertAndSend(
                "/topic/distributions",
                DistributionItemResponse(
                    distribution = DistributionItem(
                        id = 123,
                        state = DistributionStateItem(
                            name = DistributionState.DISTRIBUTION.name,
                            stateLabel = "Verteilung läuft",
                            actionLabel = "Ausgabe schließen"
                        )
                    )
                )
            )
        }
    }

    @Test
    fun `assign customer with invalid data`() {
        every {
            service.assignCustomerToDistribution(
                any(),
                any(),
                any()
            )
        } throws TafelException("dummy error")

        val requestBody = AssignCustomerRequest(customerId = 1, ticketNumber = 100)

        val exception = assertThrows<TafelException> {
            controller.assignCustomerToDistribution(requestBody)
        }

        assertThat(exception.message).isEqualTo("dummy error")
    }

    @Test
    fun `assign customer with valid data`() {
        val requestBody = AssignCustomerRequest(customerId = 1, ticketNumber = 100)
        val response = controller.assignCustomerToDistribution(requestBody)

        assertThat(response.statusCode).isEqualTo(HttpStatus.NO_CONTENT)
        assertThat(response.body).isNull()
    }

    @Test
    fun `generate customerlist pdf - no result`() {
        every { service.generateCustomerListPdf() } returns null

        val response = controller.generateCustomerListPdf()

        assertThat(response.statusCode).isEqualTo(HttpStatus.NO_CONTENT)
        assertThat(response.body).isNull()
    }

    @Test
    fun `generate customerlist pdf - result mapped`() {
        val testFilename = "file.pdf"
        every { service.generateCustomerListPdf() } returns CustomerListPdfResult(
            filename = testFilename,
            bytes = testFilename.toByteArray()
        )

        val response = controller.generateCustomerListPdf()

        assertThat(response.statusCode).isEqualTo(HttpStatus.OK)
        assertThat(
            response.headers.filter { it.key === HttpHeaders.CONTENT_TYPE }
                .map { it.value.first().toString() }.first()
        ).isEqualTo(MediaType.APPLICATION_PDF_VALUE)

        assertThat(
            response.headers.filter { it.key === HttpHeaders.CONTENT_DISPOSITION }
                .map { it.value.first().toString() }.first()
        ).isEqualTo("inline; filename=$testFilename")

        val bodyBytes = response.body?.inputStream?.readAllBytes()!!
        assertThat(String(bodyBytes)).isEqualTo(testFilename)
    }

    @Test
    fun `get current ticket without open distribution`() {
        every { service.getCurrentDistribution() } returns null

        val exception = assertThrows<TafelValidationException> { controller.getCurrentTicket() }
        assertThat(exception.message).isEqualTo("Ausgabe nicht gestartet!")
    }

    @Test
    fun `get current ticket with open distribution`() {
        val distributionEntity = DistributionEntity()
        distributionEntity.id = 123
        distributionEntity.state = DistributionState.DISTRIBUTION
        every { service.getCurrentDistribution() } returns distributionEntity

        val ticketNumber = 123
        every { service.getCurrentTicket(distributionEntity) } returns ticketNumber

        val response = controller.getCurrentTicket()

        assertThat(response.ticketNumber).isEqualTo(ticketNumber)
    }

    @Test
    fun `get current ticket when ticket is null`() {
        val distributionEntity = DistributionEntity()
        distributionEntity.id = 123
        distributionEntity.state = DistributionState.DISTRIBUTION
        every { service.getCurrentDistribution() } returns distributionEntity

        every { service.getCurrentTicket(distributionEntity) } returns null

        val response = controller.getCurrentTicket()

        assertThat(response.ticketNumber).isNull()
    }

    @Test
    fun `get next ticket without open distribution`() {
        every { service.getCurrentDistribution() } returns null

        val exception = assertThrows<TafelValidationException> { controller.getNextTicket() }
        assertThat(exception.message).isEqualTo("Ausgabe nicht gestartet!")
    }

    @Test
    fun `get next ticket with open distribution`() {
        val distributionEntity = DistributionEntity()
        distributionEntity.id = 123
        distributionEntity.state = DistributionState.DISTRIBUTION
        every { service.getCurrentDistribution() } returns distributionEntity

        val ticketNumber = 123
        every { service.closeCurrentTicketAndGetNext(distributionEntity) } returns ticketNumber

        val response = controller.getNextTicket()

        assertThat(response.ticketNumber).isEqualTo(ticketNumber)
    }

    @Test
    fun `get next ticket when ticket is null`() {
        val distributionEntity = DistributionEntity()
        distributionEntity.id = 123
        distributionEntity.state = DistributionState.DISTRIBUTION
        every { service.getCurrentDistribution() } returns distributionEntity

        every { service.closeCurrentTicketAndGetNext(distributionEntity) } returns null

        val response = controller.getNextTicket()

        assertThat(response.ticketNumber).isNull()
    }

}
