package at.wrk.tafel.admin.backend.database.model.audit

import at.wrk.tafel.admin.backend.TafelBaseIntegrationTest
import at.wrk.tafel.admin.backend.database.common.audit.AuditOperation
import org.assertj.core.api.Assertions.assertThat
import org.junit.jupiter.api.Test
import org.springframework.beans.factory.annotation.Autowired
import java.time.LocalDateTime

/**
 * [AuditLogRepository.findActorsWithOperationCountAbove] against a real database - a custom JPQL
 * `GROUP BY`/`HAVING` query, which a mocked repository (as every unit test uses) cannot validate.
 * Backs `ExcessiveReadAccessDetectionService` (GDPR gap G11).
 */
class AuditLogRepositoryIT : TafelBaseIntegrationTest() {

    @Autowired
    private lateinit var auditLogRepository: AuditLogRepository

    private companion object {
        val SINCE: LocalDateTime = LocalDateTime.of(2000, 6, 1, 0, 0)
        val WITHIN_WINDOW: LocalDateTime = LocalDateTime.of(2000, 6, 1, 12, 0)
        val BEFORE_WINDOW: LocalDateTime = LocalDateTime.of(2000, 5, 31, 23, 0)
    }

    @Test
    fun `only actors whose count within the window exceeds the threshold are returned`() {
        val heavyReader = "gr_audit_repo_it_heavy"
        val lightReader = "gr_audit_repo_it_light"

        repeat(3) { givenAuditEntry(heavyReader, AuditOperation.READ, WITHIN_WINDOW) }
        repeat(1) { givenAuditEntry(lightReader, AuditOperation.READ, WITHIN_WINDOW) }
        // Outside the window and of the wrong operation - neither may count towards either actor.
        givenAuditEntry(heavyReader, AuditOperation.READ, BEFORE_WINDOW)
        givenAuditEntry(heavyReader, AuditOperation.UPDATE, WITHIN_WINDOW)

        val result = auditLogRepository.findActorsWithOperationCountAbove(AuditOperation.READ, SINCE, 2L)

        assertThat(result).hasSize(1)
        assertThat(result[0].username).isEqualTo(heavyReader)
        assertThat(result[0].readCount).isEqualTo(3L)
    }

    @Test
    fun `nobody is returned when nothing exceeds the threshold`() {
        givenAuditEntry("gr_audit_repo_it_below", AuditOperation.READ, WITHIN_WINDOW)

        val result = auditLogRepository.findActorsWithOperationCountAbove(AuditOperation.READ, SINCE, 5L)

        assertThat(result).isEmpty()
    }

    private fun givenAuditEntry(actorUsername: String, operation: AuditOperation, occurredAt: LocalDateTime) {
        auditLogRepository.save(
            AuditLogEntity(
                occurredAt = occurredAt,
                entityType = "AuditLogRepositoryIT",
                operation = operation,
            ).apply {
                this.actorUsername = actorUsername
            },
        )
    }
}
