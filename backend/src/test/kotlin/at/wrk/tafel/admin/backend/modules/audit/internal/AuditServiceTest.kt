package at.wrk.tafel.admin.backend.modules.audit.internal

import at.wrk.tafel.admin.backend.database.common.audit.AuditOperation
import at.wrk.tafel.admin.backend.database.common.audit.AuditScope
import at.wrk.tafel.admin.backend.database.model.audit.AuditLogEntity
import at.wrk.tafel.admin.backend.database.model.audit.AuditLogRepository
import at.wrk.tafel.admin.backend.modules.audit.AuditSearchFilter
import io.mockk.every
import io.mockk.impl.annotations.RelaxedMockK
import io.mockk.junit5.MockKExtension
import io.mockk.slot
import io.mockk.verify
import org.assertj.core.api.Assertions.assertThat
import org.junit.jupiter.api.BeforeEach
import org.junit.jupiter.api.Test
import org.junit.jupiter.api.extension.ExtendWith
import org.springframework.data.domain.PageImpl
import org.springframework.data.domain.PageRequest
import org.springframework.data.domain.Pageable
import org.springframework.data.jpa.domain.Specification
import tools.jackson.databind.json.JsonMapper
import java.time.LocalDate
import java.time.LocalDateTime

@ExtendWith(MockKExtension::class)
class AuditServiceTest {

    @RelaxedMockK
    private lateinit var auditLogRepository: AuditLogRepository

    private lateinit var service: AuditService

    @BeforeEach
    fun beforeEach() {
        service = AuditService(auditLogRepository, JsonMapper.builder().build())
    }

    @Test
    fun `household history expands the stored diff into displayable field changes`() {
        every {
            auditLogRepository.findAllByBusinessKeyAndEntityTypeInOrderByOccurredAtDescIdDesc(any(), any(), any())
        } returns PageImpl(listOf(auditEntry("""{"addressCity": ["Wien", "Graz"], "email": [null, "a@b.at"]}""")))

        val result = service.getHouseholdHistory(householdId = 1234, page = null, pageSize = null)

        assertThat(result.totalCount).isEqualTo(1)
        val entry = result.items.single()
        assertThat(entry.entityType).isEqualTo("Household")
        assertThat(entry.operation).isEqualTo(AuditOperation.UPDATE)
        assertThat(entry.actorUsername).isEqualTo("test-user")
        assertThat(entry.actorFirstname).isEqualTo("Max")
        assertThat(entry.actorLastname).isEqualTo("Mustermann")
        assertThat(entry.changes).hasSize(2)
        assertThat(entry.changes.map { it.field }).containsExactly("addressCity", "email")
        assertThat(entry.changes.first().oldValue).isEqualTo("Wien")
        assertThat(entry.changes.first().newValue).isEqualTo("Graz")
        assertThat(entry.changes.last().oldValue).isNull()
    }

    @Test
    fun `household history asks only for the entity types that belong to a household`() {
        every {
            auditLogRepository.findAllByBusinessKeyAndEntityTypeInOrderByOccurredAtDescIdDesc(any(), any(), any())
        } returns PageImpl(emptyList())

        service.getHouseholdHistory(householdId = 1234, page = 2, pageSize = 25)

        val businessKey = slot<String>()
        val entityTypes = slot<Collection<String>>()
        val pageable = slot<Pageable>()
        verify {
            auditLogRepository.findAllByBusinessKeyAndEntityTypeInOrderByOccurredAtDescIdDesc(
                capture(businessKey),
                capture(entityTypes),
                capture(pageable),
            )
        }
        assertThat(businessKey.captured).isEqualTo("1234")
        assertThat(entityTypes.captured).containsExactlyInAnyOrderElementsOf(AuditScope.householdScopedEntityTypes)
        assertThat(entityTypes.captured).doesNotContain("User")
        assertThat(pageable.captured.pageNumber).isEqualTo(1)
        assertThat(pageable.captured.pageSize).isEqualTo(25)
    }

    @Test
    fun `an unparseable diff still yields the entry, just without field changes`() {
        every {
            auditLogRepository.findAllByBusinessKeyAndEntityTypeInOrderByOccurredAtDescIdDesc(any(), any(), any())
        } returns PageImpl(listOf(auditEntry("not-json")))

        val result = service.getHouseholdHistory(householdId = 1234, page = null, pageSize = null)

        assertThat(result.items).hasSize(1)
        assertThat(result.items.single().changes).isEmpty()
    }

    @Test
    fun `search pages newest first and tie-breaks on the id`() {
        every { auditLogRepository.findAll(any<Specification<AuditLogEntity>>(), any<Pageable>()) } returns PageImpl(emptyList())

        service.search(AuditSearchFilter(), page = null, pageSize = null)

        val pageable = slot<Pageable>()
        verify { auditLogRepository.findAll(any<Specification<AuditLogEntity>>(), capture(pageable)) }
        assertThat(pageable.captured.sort.map { "${it.property}:${it.direction}" })
            .containsExactly("occurredAt:DESC", "id:DESC")
    }

    @Test
    fun `search applies every given filter`() {
        every { auditLogRepository.findAll(any<Specification<AuditLogEntity>>(), any<Pageable>()) } returns
            PageImpl(listOf(auditEntry(null)), PageRequest.of(0, 10), 1)

        val result = service.search(
            AuditSearchFilter(
                entityType = "Household",
                operation = AuditOperation.UPDATE,
                actorUsername = "test-user",
                businessKey = "1234",
                from = LocalDate.of(2026, 1, 1),
                to = LocalDate.of(2026, 1, 31),
            ),
            page = 1,
            pageSize = 10,
        )

        assertThat(result.items).hasSize(1)
        assertThat(result.items.single().changes).isEmpty()
        verify { auditLogRepository.findAll(any<Specification<AuditLogEntity>>(), any<Pageable>()) }
    }

    private fun auditEntry(changedFields: String?) = AuditLogEntity(
        occurredAt = LocalDateTime.of(2026, 8, 9, 12, 0),
        entityType = "Household",
        operation = AuditOperation.UPDATE,
    ).apply {
        id = 1
        entityId = 99
        businessKey = "1234"
        actorUsername = "test-user"
        actorFirstname = "Max"
        actorLastname = "Mustermann"
        this.changedFields = changedFields
    }
}
