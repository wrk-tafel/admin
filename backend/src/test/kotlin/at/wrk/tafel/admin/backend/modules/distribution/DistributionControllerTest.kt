package at.wrk.tafel.admin.backend.modules.distribution

import at.wrk.tafel.admin.backend.database.common.sse_outbox.SseOutboxService
import at.wrk.tafel.admin.backend.database.model.distribution.DistributionEntity
import at.wrk.tafel.admin.backend.modules.base.exception.TafelException
import at.wrk.tafel.admin.backend.modules.distribution.DistributionController.Companion.DISTRIBUTION_UPDATE_NOTIFICATION_NAME
import at.wrk.tafel.admin.backend.modules.distribution.internal.DistributionService
import at.wrk.tafel.admin.backend.modules.distribution.internal.model.*
import io.mockk.every
import io.mockk.impl.annotations.InjectMockKs
import io.mockk.impl.annotations.RelaxedMockK
import io.mockk.junit5.MockKExtension
import io.mockk.slot
import io.mockk.verify
import io.mockk.verifySequence
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
        val distributionEntity = DistributionEntity()
        distributionEntity.id = 123
        distributionEntity.startedAt = LocalDateTime.now()
        distributionEntity.endedAt = null
        every { service.createNewDistribution() } returns distributionEntity

        controller.createNewDistribution()

        val distributionItemResponse = DistributionItemUpdate(
            distribution = DistributionItem(
                id = distributionEntity.id!!,
                startedAt = distributionEntity.startedAt!!,
                endedAt = distributionEntity.endedAt
            )
        )

        verify {
            sseOutboxService.saveOutboxEntry(
                notificationName = DISTRIBUTION_UPDATE_NOTIFICATION_NAME,
                payload = distributionItemResponse
            )
        }
    }

    @Test
    fun `get distributions`() {
        val distributionEntity = DistributionEntity()
        distributionEntity.id = 123
        distributionEntity.startedAt = LocalDateTime.now()
        distributionEntity.endedAt = null
        every { service.getDistributions() } returns listOf(distributionEntity)

        val response = controller.getDistributions()

        assertThat(response).isEqualTo(
            DistributionListResponse(
                items = listOf(
                    DistributionItem(
                        id = distributionEntity.id!!,
                        startedAt = distributionEntity.startedAt!!,
                        endedAt = distributionEntity.endedAt
                    )
                )
            )
        )
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
    fun `listen for distribution updates with active distribution`() {
        val distributionEntity = DistributionEntity()
        distributionEntity.id = 123
        distributionEntity.startedAt = LocalDateTime.now()
        distributionEntity.endedAt = null
        every { service.getCurrentDistribution() } returns distributionEntity

        val sseEmitter = controller.listenForDistributionUpdates()
        assertThat(sseEmitter).isNotNull

        verifySequence {
            sseOutboxService.sendEvent(
                sseEmitter,
                DistributionItemUpdate(
                    distribution = DistributionItem(
                        id = distributionEntity.id!!,
                        startedAt = distributionEntity.startedAt!!,
                        endedAt = distributionEntity.endedAt
                    )
                )
            )

            sseOutboxService.forwardNotificationEventsToSse(
                sseEmitter = sseEmitter,
                notificationName = DISTRIBUTION_UPDATE_NOTIFICATION_NAME,
                resultType = DistributionItemUpdate::class.java
            )
        }
    }

    @Test
    fun `listen for distribution updates without active distribution`() {
        every { service.getCurrentDistribution() } returns null

        val sseEmitter = controller.listenForDistributionUpdates()
        assertThat(sseEmitter).isNotNull

        verifySequence {
            sseOutboxService.sendEvent(
                sseEmitter,
                DistributionItemUpdate(
                    distribution = null
                )
            )

            sseOutboxService.forwardNotificationEventsToSse(
                sseEmitter = sseEmitter,
                notificationName = DISTRIBUTION_UPDATE_NOTIFICATION_NAME,
                resultType = DistributionItemUpdate::class.java
            )
        }
    }

    @Test
    fun `save distribution statistic`() {
        val statisticData = DistributionStatisticData(
            employeeCount = 100,
            selectedShelterIds = listOf(1, 2, 3)
        )

        val response = controller.saveDistributionStatistic(statisticData)

        assertThat(response.statusCode).isEqualTo(HttpStatus.OK)
        verify(exactly = 1) {
            service.updateDistributionStatisticData(
                statisticData.employeeCount,
                statisticData.selectedShelterIds
            )
        }
    }

    @Test
    fun `save distribution note`() {
        val noteData = DistributionNoteData(
            notes = "dummy notes"
        )

        val response = controller.saveDistributionNotes(noteData)

        assertThat(response.statusCode).isEqualTo(HttpStatus.OK)
        verify(exactly = 1) {
            service.updateDistributionNoteData(
                noteData.notes
            )
        }
    }

    @Test
    fun `close distribution successful`() {
        val distributionEntity = DistributionEntity()
        distributionEntity.id = 123
        every { service.getCurrentDistribution() } returns distributionEntity
        every { service.validateClose() } returns DistributionCloseValidationResult(
            errors = emptyList(),
            warnings = emptyList()
        )

        val response = controller.closeDistribution(forceClose = false)

        assertThat(response.statusCode).isEqualTo(HttpStatus.OK)
        assertThat(response.body).isNull()

        verify { service.closeDistribution() }

        val distributionItemResponseSlot = slot<DistributionItemUpdate>()
        verify {
            sseOutboxService.saveOutboxEntry(
                notificationName = DISTRIBUTION_UPDATE_NOTIFICATION_NAME,
                payload = capture(distributionItemResponseSlot)
            )
        }

        assertThat(distributionItemResponseSlot.captured).isEqualTo(
            DistributionItemUpdate(
                distribution = null
            )
        )
    }

    @Test
    fun `close distribution failed with errors`() {
        val distributionEntity = DistributionEntity()
        distributionEntity.id = 123
        every { service.getCurrentDistribution() } returns distributionEntity

        val validationResult = DistributionCloseValidationResult(
            errors = listOf("Error 1", "Error 2"),
            warnings = emptyList()
        )
        every { service.validateClose() } returns validationResult

        val response = controller.closeDistribution(forceClose = false)

        assertThat(response.statusCode).isEqualTo(HttpStatus.OK)
        assertThat(response.body).isEqualTo(validationResult)

        verify(exactly = 0) { service.closeDistribution() }
        verify(exactly = 0) {
            sseOutboxService.saveOutboxEntry(
                notificationName = DISTRIBUTION_UPDATE_NOTIFICATION_NAME,
                payload = any()
            )
        }
    }

    @Test
    fun `close distribution failed with warnings`() {
        val distributionEntity = DistributionEntity()
        distributionEntity.id = 123
        every { service.getCurrentDistribution() } returns distributionEntity

        val validationResult = DistributionCloseValidationResult(
            errors = emptyList(),
            warnings = listOf("Warning 1", "Warning 2")
        )
        every { service.validateClose() } returns validationResult

        val response = controller.closeDistribution(forceClose = false)

        assertThat(response.statusCode).isEqualTo(HttpStatus.OK)
        assertThat(response.body).isEqualTo(validationResult)

        verify(exactly = 0) { service.closeDistribution() }
        verify(exactly = 0) {
            sseOutboxService.saveOutboxEntry(
                notificationName = DISTRIBUTION_UPDATE_NOTIFICATION_NAME,
                payload = any()
            )
        }
    }

    @Test
    fun `close distribution failed with warnings and forceClosed`() {
        val distributionEntity = DistributionEntity()
        distributionEntity.id = 123
        every { service.getCurrentDistribution() } returns distributionEntity

        val validationResult = DistributionCloseValidationResult(
            errors = emptyList(),
            warnings = listOf("Warning 1", "Warning 2")
        )
        every { service.validateClose() } returns validationResult

        val response = controller.closeDistribution(forceClose = true)

        assertThat(response.statusCode).isEqualTo(HttpStatus.OK)
        assertThat(response.body).isNull()

        verify { service.closeDistribution() }

        val distributionItemResponseSlot = slot<DistributionItemUpdate>()
        verify {
            sseOutboxService.saveOutboxEntry(
                notificationName = DISTRIBUTION_UPDATE_NOTIFICATION_NAME,
                payload = capture(distributionItemResponseSlot)
            )
        }

        assertThat(distributionItemResponseSlot.captured).isEqualTo(
            DistributionItemUpdate(
                distribution = null
            )
        )
    }

    @Test
    fun `close distribution failed with errors, warnings and forceClosed`() {
        val distributionEntity = DistributionEntity()
        distributionEntity.id = 123
        every { service.getCurrentDistribution() } returns distributionEntity

        val validationResult = DistributionCloseValidationResult(
            errors = listOf("Error 1", "Error 2"),
            warnings = listOf("Warning 1", "Warning 2")
        )
        every { service.validateClose() } returns validationResult

        val response = controller.closeDistribution(forceClose = true)

        assertThat(response.statusCode).isEqualTo(HttpStatus.OK)
        assertThat(response.body).isEqualTo(validationResult)

        verify(exactly = 0) { service.closeDistribution() }
        verify(exactly = 0) {
            sseOutboxService.saveOutboxEntry(
                notificationName = DISTRIBUTION_UPDATE_NOTIFICATION_NAME,
                payload = any()
            )
        }
    }

    @Test
    fun `assign customer with invalid data`() {
        every {
            service.assignCustomerToDistribution(
                any(),
                any(),
                any(),
            )
        } throws TafelException("dummy error")

        val requestBody = AssignCustomerRequest(customerId = 1, ticketNumber = 100, costContributionPaid = true)

        val exception = assertThrows<TafelException> {
            controller.assignCustomerToDistribution(requestBody)
        }

        assertThat(exception.message).isEqualTo("dummy error")
    }

    @Test
    fun `assign customer with valid data`() {
        val requestBody = AssignCustomerRequest(customerId = 1, ticketNumber = 100, costContributionPaid = true)
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
    fun `send mails`() {
        val distributionId = 123L
        controller.sendMails(distributionId)

        verify { service.sendMails(distributionId) }
    }

}
