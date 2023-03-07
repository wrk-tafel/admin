package at.wrk.tafel.admin.backend.modules.distribution

import at.wrk.tafel.admin.backend.common.model.DistributionState
import at.wrk.tafel.admin.backend.database.entities.distribution.DistributionEntity
import at.wrk.tafel.admin.backend.modules.base.exception.TafelValidationFailedException
import io.mockk.every
import io.mockk.impl.annotations.InjectMockKs
import io.mockk.impl.annotations.RelaxedMockK
import io.mockk.junit5.MockKExtension
import io.mockk.verify
import org.assertj.core.api.Assertions.assertThat
import org.junit.jupiter.api.Assertions.*
import org.junit.jupiter.api.Test
import org.junit.jupiter.api.extension.ExtendWith
import org.springframework.http.HttpStatus
import org.springframework.web.server.ResponseStatusException
import java.util.*

@ExtendWith(MockKExtension::class)
internal class DistributionControllerTest {

    @RelaxedMockK
    private lateinit var service: DistributionService

    @InjectMockKs
    private lateinit var controller: DistributionController

    @Test
    fun `create new distribution`() {
        val distributionEntity = DistributionEntity()
        distributionEntity.id = 123
        distributionEntity.state = DistributionState.OPEN
        every { service.createNewDistribution() } returns distributionEntity

        val distributionItem = controller.createNewDistribution()

        assertThat(distributionItem.id).isEqualTo(distributionEntity.id)
        assertThat(distributionItem.state).isEqualTo(
            DistributionStateItem(
                name = distributionEntity.state!!.name,
                stateLabel = "Geöffnet",
                actionLabel = "Anmeldung starten"
            )
        )
    }

    @Test
    fun `create new distribution with existing ongoing distribution`() {
        val message = "MSG"
        every { service.createNewDistribution() } throws TafelValidationFailedException(message)

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

        assertThat(response.statusCode).isEqualTo(HttpStatus.OK)
        assertThat(response.body).isEqualTo(
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

        assertThat(response.statusCode).isEqualTo(HttpStatus.NO_CONTENT)
        assertThat(response.body).isNull()
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

        val response = controller.switchToNextDistributionState()

        assertThat(response.statusCode).isEqualTo(HttpStatus.BAD_REQUEST)
        assertThat(response.body).isNull()
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
    }

}
