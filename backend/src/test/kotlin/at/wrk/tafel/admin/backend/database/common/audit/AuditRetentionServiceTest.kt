package at.wrk.tafel.admin.backend.database.common.audit

import at.wrk.tafel.admin.backend.config.properties.TafelAdminProperties
import at.wrk.tafel.admin.backend.database.model.audit.AuditLogRepository
import io.mockk.every
import io.mockk.impl.annotations.RelaxedMockK
import io.mockk.junit5.MockKExtension
import io.mockk.slot
import io.mockk.verify
import org.assertj.core.api.Assertions.assertThat
import org.junit.jupiter.api.BeforeEach
import org.junit.jupiter.api.Test
import org.junit.jupiter.api.extension.ExtendWith
import java.time.Clock
import java.time.LocalDateTime
import java.time.ZoneId
import java.time.ZonedDateTime

@ExtendWith(MockKExtension::class)
class AuditRetentionServiceTest {

    @RelaxedMockK
    private lateinit var auditLogRepository: AuditLogRepository

    private lateinit var properties: TafelAdminProperties
    private lateinit var service: AuditRetentionService

    private val clock = Clock.fixed(
        ZonedDateTime.of(2026, 8, 9, 3, 30, 0, 0, ZoneId.systemDefault()).toInstant(),
        ZoneId.systemDefault(),
    )

    @BeforeEach
    fun beforeEach() {
        properties = TafelAdminProperties()
        service = AuditRetentionService(auditLogRepository, properties, clock)
    }

    @Test
    fun `removes entries older than the configured retention window`() {
        properties.audit.retentionDays = 365
        every { auditLogRepository.deleteAllByOccurredAtBefore(any()) } returns 7

        service.cleanupExpiredEntries()

        val cutoff = slot<LocalDateTime>()
        verify { auditLogRepository.deleteAllByOccurredAtBefore(capture(cutoff)) }
        assertThat(cutoff.captured).isEqualTo(LocalDateTime.of(2025, 8, 9, 3, 30, 0))
    }

    @Test
    fun `a non-positive retention keeps everything rather than deleting everything`() {
        properties.audit.retentionDays = 0

        service.cleanupExpiredEntries()

        verify(exactly = 0) { auditLogRepository.deleteAllByOccurredAtBefore(any()) }
    }
}
