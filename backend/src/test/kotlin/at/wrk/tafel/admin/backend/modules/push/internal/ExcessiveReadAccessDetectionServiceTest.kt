package at.wrk.tafel.admin.backend.modules.push.internal

import at.wrk.tafel.admin.backend.config.properties.TafelAdminProperties
import at.wrk.tafel.admin.backend.database.common.audit.AuditOperation
import at.wrk.tafel.admin.backend.database.common.audit.AuditScope
import at.wrk.tafel.admin.backend.database.model.audit.AuditActorOperationCountProjection
import at.wrk.tafel.admin.backend.database.model.audit.AuditLogRepository
import at.wrk.tafel.admin.backend.database.model.push.PushNotificationType
import io.mockk.every
import io.mockk.impl.annotations.RelaxedMockK
import io.mockk.junit5.MockKExtension
import io.mockk.verify
import org.junit.jupiter.api.BeforeEach
import org.junit.jupiter.api.Test
import org.junit.jupiter.api.extension.ExtendWith
import java.time.Clock
import java.time.Instant
import java.time.LocalDateTime
import java.time.ZoneOffset

@ExtendWith(MockKExtension::class)
internal class ExcessiveReadAccessDetectionServiceTest {

    @RelaxedMockK
    private lateinit var auditLogRepository: AuditLogRepository

    @RelaxedMockK
    private lateinit var pushBroadcastService: PushBroadcastService

    private lateinit var properties: TafelAdminProperties

    private lateinit var service: ExcessiveReadAccessDetectionService

    // 2024-03-05, 09:00 UTC - an arbitrary run time, so "the trailing hour" is unambiguous below.
    private val clock = Clock.fixed(Instant.parse("2024-03-05T09:00:00Z"), ZoneOffset.UTC)

    @BeforeEach
    fun beforeEach() {
        properties = TafelAdminProperties().apply { audit.breachDetection.readThreshold = 20 }
        service = ExcessiveReadAccessDetectionService(auditLogRepository, pushBroadcastService, properties, clock)
    }

    private fun offender(username: String, readCount: Long) = object : AuditActorOperationCountProjection {
        override val username = username
        override val readCount = readCount
    }

    @Test
    fun `notifies about a user exceeding the threshold`() {
        every {
            auditLogRepository.findActorsWithOperationCountAbove(
                AuditOperation.READ,
                LocalDateTime.parse("2024-03-05T08:00:00"),
                20L,
                AuditScope.bulkReportEntityTypes,
                10L,
            )
        } returns listOf(offender("mmuster", 23))

        service.detectExcessiveReadAccess()

        verify {
            pushBroadcastService.broadcast(
                type = PushNotificationType.EXCESSIVE_READ_ACCESS,
                title = "Ungewöhnlich viele Zugriffe",
                body = "Der Benutzer 'mmuster' hat in der letzten Stunde 23 sensible Datensätze abgerufen.",
            )
        }
    }

    @Test
    fun `notifies once per offending user`() {
        every {
            auditLogRepository.findActorsWithOperationCountAbove(any(), any(), any(), any(), any())
        } returns listOf(offender("mmuster", 23), offender("jdoe", 45))

        service.detectExcessiveReadAccess()

        verify(exactly = 1) {
            pushBroadcastService.broadcast(type = PushNotificationType.EXCESSIVE_READ_ACCESS, title = any(), body = match { it.contains("mmuster") })
        }
        verify(exactly = 1) {
            pushBroadcastService.broadcast(type = PushNotificationType.EXCESSIVE_READ_ACCESS, title = any(), body = match { it.contains("jdoe") })
        }
    }

    @Test
    fun `stays quiet when nobody exceeds the threshold`() {
        every { auditLogRepository.findActorsWithOperationCountAbove(any(), any(), any(), any(), any()) } returns emptyList()

        service.detectExcessiveReadAccess()

        verify(exactly = 0) { pushBroadcastService.broadcast(any(), any(), any()) }
    }

    @Test
    fun `passes the configured bulk-report weight and entity types through to the repository`() {
        properties.audit.breachDetection.bulkReadWeight = 7
        every {
            auditLogRepository.findActorsWithOperationCountAbove(any(), any(), any(), any(), any())
        } returns emptyList()

        service.detectExcessiveReadAccess()

        verify {
            auditLogRepository.findActorsWithOperationCountAbove(
                AuditOperation.READ,
                any(),
                20L,
                AuditScope.bulkReportEntityTypes,
                7L,
            )
        }
    }

    @Test
    fun `is switched off when the threshold is not positive`() {
        properties.audit.breachDetection.readThreshold = 0

        service.detectExcessiveReadAccess()

        verify(exactly = 0) { auditLogRepository.findActorsWithOperationCountAbove(any(), any(), any(), any(), any()) }
        verify(exactly = 0) { pushBroadcastService.broadcast(any(), any(), any()) }
    }
}
