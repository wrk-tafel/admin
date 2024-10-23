package at.wrk.tafel.admin.backend.modules.distribution.api

import at.wrk.tafel.admin.backend.database.entities.distribution.DistributionEntity
import at.wrk.tafel.admin.backend.modules.base.exception.TafelException
import at.wrk.tafel.admin.backend.modules.distribution.api.model.AssignCustomerRequest
import at.wrk.tafel.admin.backend.modules.distribution.service.internal.model.CustomerListPdfResult
import at.wrk.tafel.admin.backend.modules.distribution.api.model.DistributionItem
import at.wrk.tafel.admin.backend.modules.distribution.api.model.DistributionItemResponse
import at.wrk.tafel.admin.backend.modules.distribution.service.internal.DistributionInternalService
import at.wrk.tafel.admin.backend.common.testdata.testDistributionCustomerEntity1
import at.wrk.tafel.admin.backend.common.testdata.testDistributionCustomerEntity2
import at.wrk.tafel.admin.backend.common.testdata.testUserEntity
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
import org.springframework.http.HttpHeaders
import org.springframework.http.HttpStatus
import org.springframework.http.MediaType
import org.springframework.messaging.simp.SimpMessagingTemplate
import java.time.LocalDateTime

@ExtendWith(MockKExtension::class)
internal class DistributionControllerTest {

    @RelaxedMockK
    private lateinit var service: DistributionInternalService

    @RelaxedMockK
    private lateinit var simpMessagingTemplate: SimpMessagingTemplate

    @InjectMockKs
    private lateinit var controller: DistributionController

    @Test
    fun `create new distribution`() {
        val distributionEntity = DistributionEntity()
        distributionEntity.id = 123
        every { service.createNewDistribution() } returns distributionEntity

        controller.createNewDistribution()

        val distributionItemResponse = DistributionItemResponse(
            distribution = DistributionItem(
                id = distributionEntity.id!!
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
        every { service.getCurrentDistribution() } returns distributionEntity

        val response = controller.getCurrentDistribution()

        assertThat(response.distribution).isEqualTo(
            DistributionItem(
                id = distributionEntity.id!!
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
    fun `close distribution`() {
        val distributionEntity = DistributionEntity()
        distributionEntity.id = 123
        every { service.getCurrentDistribution() } returns distributionEntity

        val response = controller.closeDistribution()

        assertThat(response.statusCode).isEqualTo(HttpStatus.OK)
        assertThat(response.body).isNull()

        verify { service.closeDistribution() }

        val distributionItemResponseSlot = slot<DistributionItemResponse>()
        verify {
            simpMessagingTemplate.convertAndSend(
                "/topic/distributions",
                capture(distributionItemResponseSlot)
            )
        }

        assertThat(distributionItemResponseSlot.captured).isEqualTo(
            DistributionItemResponse(
                distribution = null
            )
        )
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
    fun `auto close when distribution is open`() {
        val testDistributionEntity = DistributionEntity().apply {
            id = 123
            startedAt = LocalDateTime.now()
            startedByUser = testUserEntity
            customers = listOf(
                testDistributionCustomerEntity1,
                testDistributionCustomerEntity2
            )
        }
        every { service.getCurrentDistribution() } returns testDistributionEntity

        controller.autoCloseDistribution()

        verify(exactly = 1) {
            service.closeDistribution()
        }
    }

    @Test
    fun `auto close when distribution is not open`() {
        every { service.getCurrentDistribution() } returns null

        controller.autoCloseDistribution()

        verify(exactly = 0) {
            service.closeDistribution()
        }
    }

}
