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

    /** The moment the job actually fires, so the cutoffs below read like real ones. */
    private val clock = Clock.fixed(
        ZonedDateTime.of(2026, 8, 9, 5, 0, 0, 0, ZoneId.systemDefault()).toInstant(),
        ZoneId.systemDefault(),
    )

    @BeforeEach
    fun beforeEach() {
        properties = TafelAdminProperties()
        service = AuditRetentionService(auditLogRepository, properties, clock)
    }

    @Test
    fun `removes entries older than the configured retention window`() {
        properties.audit.retentionDays = 90
        every { auditLogRepository.deleteAllByOccurredAtBeforeSkipLocked(any()) } returns 7

        service.cleanupExpiredEntries()

        val cutoff = slot<LocalDateTime>()
        verify { auditLogRepository.deleteAllByOccurredAtBeforeSkipLocked(capture(cutoff)) }
        assertThat(cutoff.captured).isEqualTo(LocalDateTime.of(2026, 5, 11, 5, 0, 0))
    }

    /**
     * The default is what every deployment that doesn't say otherwise runs with, and it is a DSGVO
     * decision rather than a tuning knob - worth failing a test if it is changed by accident.
     */
    @Test
    fun `keeps a month by default`() {
        every { auditLogRepository.deleteAllByOccurredAtBeforeSkipLocked(any()) } returns 0

        service.cleanupExpiredEntries()

        val cutoff = slot<LocalDateTime>()
        verify { auditLogRepository.deleteAllByOccurredAtBeforeSkipLocked(capture(cutoff)) }
        assertThat(cutoff.captured).isEqualTo(LocalDateTime.of(2026, 7, 10, 5, 0, 0))
    }

    @Test
    fun `a non-positive retention keeps everything rather than deleting everything`() {
        properties.audit.retentionDays = 0

        service.cleanupExpiredEntries()

        verify(exactly = 0) { auditLogRepository.deleteAllByOccurredAtBeforeSkipLocked(any()) }
    }
}
