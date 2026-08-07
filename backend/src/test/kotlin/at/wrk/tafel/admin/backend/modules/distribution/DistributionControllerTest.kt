package at.wrk.tafel.admin.backend.modules.distribution

import at.wrk.tafel.admin.backend.database.common.sseoutbox.SseOutboxService
import at.wrk.tafel.admin.backend.database.model.distribution.DistributionEntity
import at.wrk.tafel.admin.backend.modules.distribution.DistributionController.Companion.DISTRIBUTION_UPDATE_NOTIFICATION_NAME
import at.wrk.tafel.admin.backend.modules.distribution.internal.DistributionService
import at.wrk.tafel.admin.backend.modules.distribution.internal.model.*
import at.wrk.tafel.admin.backend.security.testUserEntity
import io.mockk.every
import io.mockk.impl.annotations.InjectMockKs
import io.mockk.impl.annotations.RelaxedMockK
import io.mockk.junit5.MockKExtension
import io.mockk.slot
import io.mockk.verify
import org.assertj.core.api.Assertions.assertThat
import org.junit.jupiter.api.Assertions.assertThrows
import org.junit.jupiter.api.Test
import org.junit.jupiter.api.assertThrows
import org.junit.jupiter.api.extension.ExtendWith
import org.springframework.http.HttpStatus
import java.time.LocalDateTime

@ExtendWith(MockKExtension::class)
internal class DistributionControllerTest {

    @RelaxedMockK
    private lateinit var service: DistributionService

    @RelaxedMockK
    private lateinit var sseOutboxService: SseOutboxService

    @InjectMockKs
    private lateinit var controller: DistributionController

    @Test
    fun `create new distribution`() {
        val distributionItem = DistributionItem(
            id = 123,
            startedAt = LocalDateTime.now(),
            endedAt = null,
        )
        every { service.createNewDistributionItem() } returns distributionItem

        controller.createNewDistribution()

        val distributionItemResponse = DistributionUpdateResponse(distribution = distributionItem)

        verify {
            sseOutboxService.saveOutboxEntry(
                notificationName = DISTRIBUTION_UPDATE_NOTIFICATION_NAME,
                payload = distributionItemResponse,
            )
        }
    }

    @Test
    fun `get distributions`() {
        val distributionItem = DistributionItem(
            id = 123,
            startedAt = LocalDateTime.now(),
            endedAt = null,
        )
        every { service.getDistributionItems() } returns listOf(distributionItem)

        val response = controller.getDistributions()

        assertThat(response).isEqualTo(
            DistributionListResponse(items = listOf(distributionItem)),
        )
    }

    @Test
    fun `create new distribution with existing ongoing distribution`() {
        val message = "MSG"
        every { service.createNewDistributionItem() } throws IllegalStateException(message)

        val exception = assertThrows(IllegalStateException::class.java) {
            controller.createNewDistribution()
        }

        assertThat(exception.message).isEqualTo(message)
    }

    @Test
    fun `save distribution statistic`() {
        val statisticData = DistributionStatisticRequest(
            employeeCount = 100,
            selectedShelterIds = listOf(1, 2, 3),
        )

        val response = controller.saveDistributionStatistic(statisticData)

        assertThat(response.statusCode).isEqualTo(HttpStatus.OK)
        verify(exactly = 1) {
            service.updateDistributionStatisticData(
                statisticData.employeeCount,
                statisticData.selectedShelterIds,
            )
        }
    }

    @Test
    fun `save distribution note`() {
        val noteData = DistributionNoteRequest(
            notes = "dummy notes",
        )

        val response = controller.saveDistributionNotes(noteData)

        assertThat(response.statusCode).isEqualTo(HttpStatus.OK)
        verify(exactly = 1) {
            service.updateDistributionNoteData(
                noteData.notes,
            )
        }
    }

    @Test
    fun `close distribution successful`() {
        val distributionEntity = DistributionEntity(startedAt = LocalDateTime.now(), startedByUser = testUserEntity)
        distributionEntity.id = 123
        every { service.getCurrentDistribution() } returns distributionEntity
        every { service.validateClose() } returns DistributionCloseResponse(
            errors = emptyList(),
            warnings = emptyList(),
        )

        val response = controller.closeDistribution(forceClose = false)

        assertThat(response.statusCode).isEqualTo(HttpStatus.OK)
        assertThat(response.body).isNull()

        verify { service.closeDistribution() }

        val distributionItemResponseSlot = slot<DistributionUpdateResponse>()
        verify {
            sseOutboxService.saveOutboxEntry(
                notificationName = DISTRIBUTION_UPDATE_NOTIFICATION_NAME,
                payload = capture(distributionItemResponseSlot),
            )
        }

        assertThat(distributionItemResponseSlot.captured).isEqualTo(
            DistributionUpdateResponse(
                distribution = null,
            ),
        )
    }

    @Test
    fun `close distribution failed with errors`() {
        val distributionEntity = DistributionEntity(startedAt = LocalDateTime.now(), startedByUser = testUserEntity)
        distributionEntity.id = 123
        every { service.getCurrentDistribution() } returns distributionEntity

        val validationResult = DistributionCloseResponse(
            errors = listOf("Error 1", "Error 2"),
            warnings = emptyList(),
        )
        every { service.validateClose() } returns validationResult

        val response = controller.closeDistribution(forceClose = false)

        assertThat(response.statusCode).isEqualTo(HttpStatus.OK)
        assertThat(response.body).isEqualTo(validationResult)

        verify(exactly = 0) { service.closeDistribution() }
        verify(exactly = 0) {
            sseOutboxService.saveOutboxEntry(
                notificationName = DISTRIBUTION_UPDATE_NOTIFICATION_NAME,
                payload = any(),
            )
        }
    }

    @Test
    fun `close distribution failed with warnings`() {
        val distributionEntity = DistributionEntity(startedAt = LocalDateTime.now(), startedByUser = testUserEntity)
        distributionEntity.id = 123
        every { service.getCurrentDistribution() } returns distributionEntity

        val validationResult = DistributionCloseResponse(
            errors = emptyList(),
            warnings = listOf("Warning 1", "Warning 2"),
        )
        every { service.validateClose() } returns validationResult

        val response = controller.closeDistribution(forceClose = false)

        assertThat(response.statusCode).isEqualTo(HttpStatus.OK)
        assertThat(response.body).isEqualTo(validationResult)

        verify(exactly = 0) { service.closeDistribution() }
        verify(exactly = 0) {
            sseOutboxService.saveOutboxEntry(
                notificationName = DISTRIBUTION_UPDATE_NOTIFICATION_NAME,
                payload = any(),
            )
        }
    }

    @Test
    fun `close distribution failed with warnings and forceClosed`() {
        val distributionEntity = DistributionEntity(startedAt = LocalDateTime.now(), startedByUser = testUserEntity)
        distributionEntity.id = 123
        every { service.getCurrentDistribution() } returns distributionEntity

        val validationResult = DistributionCloseResponse(
            errors = emptyList(),
            warnings = listOf("Warning 1", "Warning 2"),
        )
        every { service.validateClose() } returns validationResult

        val response = controller.closeDistribution(forceClose = true)

        assertThat(response.statusCode).isEqualTo(HttpStatus.OK)
        assertThat(response.body).isNull()

        verify { service.closeDistribution() }

        val distributionItemResponseSlot = slot<DistributionUpdateResponse>()
        verify {
            sseOutboxService.saveOutboxEntry(
                notificationName = DISTRIBUTION_UPDATE_NOTIFICATION_NAME,
                payload = capture(distributionItemResponseSlot),
            )
        }

        assertThat(distributionItemResponseSlot.captured).isEqualTo(
            DistributionUpdateResponse(
                distribution = null,
            ),
        )
    }

    @Test
    fun `close distribution failed with errors, warnings and forceClosed`() {
        val distributionEntity = DistributionEntity(startedAt = LocalDateTime.now(), startedByUser = testUserEntity)
        distributionEntity.id = 123
        every { service.getCurrentDistribution() } returns distributionEntity

        val validationResult = DistributionCloseResponse(
            errors = listOf("Error 1", "Error 2"),
            warnings = listOf("Warning 1", "Warning 2"),
        )
        every { service.validateClose() } returns validationResult

        val response = controller.closeDistribution(forceClose = true)

        assertThat(response.statusCode).isEqualTo(HttpStatus.OK)
        assertThat(response.body).isEqualTo(validationResult)

        verify(exactly = 0) { service.closeDistribution() }
        verify(exactly = 0) {
            sseOutboxService.saveOutboxEntry(
                notificationName = DISTRIBUTION_UPDATE_NOTIFICATION_NAME,
                payload = any(),
            )
        }
    }

    @Test
    fun `assign household with invalid data`() {
        every {
            service.assignHouseholdToDistribution(
                any(),
                any(),
            )
        } throws IllegalStateException("dummy error")

        val requestBody = AssignHouseholdRequest(householdId = 1, ticketNumber = 100)

        val exception = assertThrows<IllegalStateException> {
            controller.assignHouseholdToDistribution(requestBody)
        }

        assertThat(exception.message).isEqualTo("dummy error")
    }

    @Test
    fun `assign household with valid data`() {
        val requestBody = AssignHouseholdRequest(householdId = 1, ticketNumber = 100)
        val response = controller.assignHouseholdToDistribution(requestBody)

        assertThat(response.statusCode).isEqualTo(HttpStatus.NO_CONTENT)
        assertThat(response.body).isNull()
    }

    @Test
    fun `generate householdlist pdf - no result`() {
        every { service.generateHouseholdListPdf() } returns null

        val response = controller.generateHouseholdListPdf()

        assertThat(response.statusCode).isEqualTo(HttpStatus.NO_CONTENT)
        assertThat(response.body).isNull()
    }

    @Test
    fun `send mails`() {
        val distributionId = 123L
        controller.sendMails(distributionId)

        verify { service.sendMails(distributionId) }
    }
}
