package at.wrk.tafel.admin.backend.modules.distribution

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
    fun `start distribution`() {
        val distributionEntity = DistributionEntity()
        distributionEntity.id = 123
        every { service.startDistribution() } returns distributionEntity

        val distributionItem = controller.startDistribution()

        assertThat(distributionItem.id).isEqualTo(distributionEntity.id)
    }

    @Test
    fun `start distribution with existing ongoing distribution`() {
        val message = "MSG"
        every { service.startDistribution() } throws TafelValidationFailedException(message)

        val exception = assertThrows(ResponseStatusException::class.java) {
            controller.startDistribution()
        }
        assertThat(exception.statusCode).isEqualTo(HttpStatus.BAD_REQUEST)
        assertThat(exception.reason).isEqualTo(message)
    }

    @Test
    fun `stop distribution`() {
        controller.stopDistribution(123)

        verify { service.stopDistribution(123) }
    }

    @Test
    fun `current distribution found`() {
        val distributionEntity = DistributionEntity()
        distributionEntity.id = 123
        every { service.getCurrentDistribution() } returns distributionEntity

        val response = controller.getCurrentDistribution()

        assertThat(response.statusCode).isEqualTo(HttpStatus.OK)
        assertThat(response.body).isEqualTo(DistributionItem(id = distributionEntity.id!!))
    }

    @Test
    fun `current distribution not found`() {
        every { service.getCurrentDistribution() } returns null

        val response = controller.getCurrentDistribution()

        assertThat(response.statusCode).isEqualTo(HttpStatus.NO_CONTENT)
        assertThat(response.body).isNull()
    }

}
