package at.wrk.tafel.admin.backend.database.model.audit

import at.wrk.tafel.admin.backend.TafelBaseIntegrationTest
import at.wrk.tafel.admin.backend.database.common.audit.AuditOperation
import at.wrk.tafel.admin.backend.database.common.audit.AuditScope
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

        // A separate, earlier window for the weighting test below: entries are never rolled back
        // between test methods here (a real, committed database, not a `@Transactional` test), and
        // `SINCE` above has no upper bound - an entry at WITHIN_WINDOW would also be picked up by
        // the two tests above, which assume nothing but their own actors clears their thresholds.
        val WEIGHTING_SINCE: LocalDateTime = LocalDateTime.of(1999, 6, 1, 0, 0)
        val WEIGHTING_WITHIN_WINDOW: LocalDateTime = LocalDateTime.of(1999, 6, 1, 12, 0)
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

        val result = auditLogRepository.findActorsWithOperationCountAbove(AuditOperation.READ, SINCE, 2L, AuditScope.bulkReportEntityTypes, 10L)

        assertThat(result).hasSize(1)
        assertThat(result[0].username).isEqualTo(heavyReader)
        assertThat(result[0].readCount).isEqualTo(3L)
    }

    @Test
    fun `nobody is returned when nothing exceeds the threshold`() {
        givenAuditEntry("gr_audit_repo_it_below", AuditOperation.READ, WITHIN_WINDOW)

        val result = auditLogRepository.findActorsWithOperationCountAbove(AuditOperation.READ, SINCE, 5L, AuditScope.bulkReportEntityTypes, 10L)

        assertThat(result).isEmpty()
    }

    @Test
    fun `a bulk report entry counts as the configured weight, not as 1`() {
        val reportReader = "gr_audit_repo_it_report"

        // One plain household read plus one bulk-report read: 1 + 10 = 11 with the default weight,
        // which clears a threshold neither entry alone (nor 2 unweighted entries) would.
        givenAuditEntry(reportReader, AuditOperation.READ, WEIGHTING_WITHIN_WINDOW, entityType = "Household")
        givenAuditEntry(reportReader, AuditOperation.READ, WEIGHTING_WITHIN_WINDOW, entityType = AuditScope.HOUSEHOLDS_ABOVE_LIMIT_ENTITY_TYPE)

        val result = auditLogRepository.findActorsWithOperationCountAbove(AuditOperation.READ, WEIGHTING_SINCE, 5L, AuditScope.bulkReportEntityTypes, 10L)

        assertThat(result).hasSize(1)
        assertThat(result[0].username).isEqualTo(reportReader)
        assertThat(result[0].readCount).isEqualTo(11L)
    }

    private fun givenAuditEntry(
        actorUsername: String,
        operation: AuditOperation,
        occurredAt: LocalDateTime,
        entityType: String = "AuditLogRepositoryIT",
    ) {
        auditLogRepository.save(
            AuditLogEntity(
                occurredAt = occurredAt,
                entityType = entityType,
                operation = operation,
            ).apply {
                this.actorUsername = actorUsername
            },
        )
    }
}
