package at.wrk.tafel.admin.backend.modules.distribution

import at.wrk.tafel.admin.backend.common.model.DistributionState
import at.wrk.tafel.admin.backend.database.entities.distribution.DistributionEntity
import at.wrk.tafel.admin.backend.modules.base.exception.TafelException
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
import org.springframework.http.HttpStatus
import org.springframework.messaging.simp.SimpMessagingTemplate
import org.springframework.web.server.ResponseStatusException
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

        val exception = assertThrows(ResponseStatusException::class.java) {
            controller.createNewDistribution()
        }

        assertThat(exception.statusCode).isEqualTo(HttpStatus.BAD_REQUEST)
        assertThat(exception.reason).isEqualTo(message)
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

        val exception = assertThrows<TafelException> {
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

}
