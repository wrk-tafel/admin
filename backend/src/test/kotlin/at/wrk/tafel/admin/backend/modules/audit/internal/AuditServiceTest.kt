package at.wrk.tafel.admin.backend.modules.audit.internal

import at.wrk.tafel.admin.backend.common.auth.model.TafelJwtAuthentication
import at.wrk.tafel.admin.backend.database.common.audit.AuditLogWriter
import at.wrk.tafel.admin.backend.database.common.audit.AuditOperation
import at.wrk.tafel.admin.backend.database.common.audit.AuditScope
import at.wrk.tafel.admin.backend.database.model.audit.AuditActorProjection
import at.wrk.tafel.admin.backend.database.model.audit.AuditLogEntity
import at.wrk.tafel.admin.backend.database.model.audit.AuditLogRepository
import at.wrk.tafel.admin.backend.modules.audit.AuditFieldChangeItem
import at.wrk.tafel.admin.backend.modules.audit.AuditSearchFilter
import io.mockk.every
import io.mockk.impl.annotations.RelaxedMockK
import io.mockk.junit5.MockKExtension
import io.mockk.slot
import io.mockk.verify
import org.assertj.core.api.Assertions.assertThat
import org.junit.jupiter.api.AfterEach
import org.junit.jupiter.api.BeforeEach
import org.junit.jupiter.api.Test
import org.junit.jupiter.api.extension.ExtendWith
import org.springframework.data.domain.PageImpl
import org.springframework.data.domain.PageRequest
import org.springframework.data.domain.Pageable
import org.springframework.data.jpa.domain.Specification
import org.springframework.security.core.authority.SimpleGrantedAuthority
import org.springframework.security.core.context.SecurityContextHolder
import org.springframework.security.core.context.SecurityContextImpl
import tools.jackson.databind.json.JsonMapper
import java.time.LocalDate
import java.time.LocalDateTime

@ExtendWith(MockKExtension::class)
class AuditServiceTest {

    @RelaxedMockK
    private lateinit var auditLogRepository: AuditLogRepository

    @RelaxedMockK
    private lateinit var auditLogWriter: AuditLogWriter

    private lateinit var service: AuditService

    @BeforeEach
    fun beforeEach() {
        service = AuditService(auditLogRepository, JsonMapper.builder().build(), auditLogWriter)
    }

    @AfterEach
    fun afterEach() {
        SecurityContextHolder.clearContext()
    }

    private fun authenticateWith(vararg authorities: String) {
        SecurityContextHolder.setContext(
            SecurityContextImpl(
                TafelJwtAuthentication(
                    tokenValue = "TOKEN",
                    username = "test-user",
                    authorities = authorities.map { SimpleGrantedAuthority(it) },
                ),
            ),
        )
    }

    @Test
    fun `household history expands the stored diff into displayable field changes for a caller with CUSTOMER`() {
        authenticateWith("AUDIT_LOG", "CUSTOMER")
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

    // AuditController.getHouseholdHistory requires CUSTOMER outright, but the service itself must
    // not rely on that - a redacted result rather than a leak is what protects a future caller that
    // forgets to gate itself the same way.
    @Test
    fun `household history redacts field values for a caller without CUSTOMER, but still names what changed`() {
        authenticateWith("AUDIT_LOG")
        every {
            auditLogRepository.findAllByBusinessKeyAndEntityTypeInOrderByOccurredAtDescIdDesc(any(), any(), any())
        } returns PageImpl(listOf(auditEntry("""{"addressCity": ["Wien", "Graz"]}""")))

        val result = service.getHouseholdHistory(householdId = 1234, page = null, pageSize = null)

        val entry = result.items.single()
        assertThat(entry.entityType).isEqualTo("Household")
        assertThat(entry.businessKey).isEqualTo("1234")
        assertThat(entry.actorUsername).isEqualTo("test-user")
        assertThat(entry.changes).isEmpty()
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

    // Reading the audit trail is itself never recorded before issue #3474 - see the module README.
    @Test
    fun `household history records a read of the household it serves`() {
        every {
            auditLogRepository.findAllByBusinessKeyAndEntityTypeInOrderByOccurredAtDescIdDesc(any(), any(), any())
        } returns PageImpl(emptyList())

        service.getHouseholdHistory(householdId = 1234, page = null, pageSize = null)

        val entrySlot = slot<AuditLogWriter.PendingEntry>()
        verify { auditLogWriter.record(capture(entrySlot)) }
        assertThat(entrySlot.captured.entityType).isEqualTo("Household")
        assertThat(entrySlot.captured.businessKey).isEqualTo("1234")
        assertThat(entrySlot.captured.operation).isEqualTo(AuditOperation.READ)
        assertThat(entrySlot.captured.changedFields).isEmpty()
    }

    @Test
    fun `an unparseable diff still yields the entry, just without field changes`() {
        authenticateWith("AUDIT_LOG", "CUSTOMER")
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

    // Reading the audit trail is itself never recorded before issue #3474 - see the module README.
    @Test
    fun `search records a read with no business key when no filter was applied`() {
        every { auditLogRepository.findAll(any<Specification<AuditLogEntity>>(), any<Pageable>()) } returns PageImpl(emptyList())

        service.search(AuditSearchFilter(), page = null, pageSize = null)

        val entrySlot = slot<AuditLogWriter.PendingEntry>()
        verify { auditLogWriter.record(capture(entrySlot)) }
        assertThat(entrySlot.captured.entityType).isEqualTo(AuditScope.AUDIT_LOG_QUERY_ENTITY_TYPE)
        assertThat(entrySlot.captured.businessKey).isNull()
        assertThat(entrySlot.captured.operation).isEqualTo(AuditOperation.READ)
        assertThat(entrySlot.captured.changedFields).isEmpty()
    }

    @Test
    fun `search records a read with the applied filter as its business key`() {
        every { auditLogRepository.findAll(any<Specification<AuditLogEntity>>(), any<Pageable>()) } returns PageImpl(emptyList())

        service.search(
            AuditSearchFilter(
                entityType = "Household",
                operation = AuditOperation.UPDATE,
                actorUsername = "test-user",
                businessKey = "1234",
                from = LocalDate.of(2026, 1, 1),
                to = LocalDate.of(2026, 1, 31),
            ),
            page = null,
            pageSize = null,
        )

        val entrySlot = slot<AuditLogWriter.PendingEntry>()
        verify { auditLogWriter.record(capture(entrySlot)) }
        assertThat(entrySlot.captured.businessKey).isEqualTo(
            "entityType=Household;operation=UPDATE;actorUsername=test-user;businessKey=1234;from=2026-01-01;to=2026-01-31",
        )
    }

    @Test
    fun `search applies every given filter`() {
        authenticateWith("AUDIT_LOG", "CUSTOMER")
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

    // The global log screen mixes household-scoped entries with user/settings ones under the single
    // AUDIT_LOG permission (see the module README) - a caller without CUSTOMER must still not read a
    // household's field values through it, which is exactly what issue #3421 found.
    @Test
    fun `search redacts a household-scoped entry's field values for a caller without CUSTOMER`() {
        authenticateWith("AUDIT_LOG")
        every { auditLogRepository.findAll(any<Specification<AuditLogEntity>>(), any<Pageable>()) } returns
            PageImpl(listOf(auditEntry("""{"income": ["100", "200"]}""")))

        val result = service.search(AuditSearchFilter(), page = null, pageSize = null)

        val entry = result.items.single()
        assertThat(entry.entityType).isEqualTo("Household")
        assertThat(entry.businessKey).isEqualTo("1234")
        assertThat(entry.actorUsername).isEqualTo("test-user")
        assertThat(entry.changes).isEmpty()
    }

    @Test
    fun `search still shows a household-scoped entry's field values for a caller with CUSTOMER`() {
        authenticateWith("AUDIT_LOG", "CUSTOMER")
        every { auditLogRepository.findAll(any<Specification<AuditLogEntity>>(), any<Pageable>()) } returns
            PageImpl(listOf(auditEntry("""{"income": ["100", "200"]}""")))

        val result = service.search(AuditSearchFilter(), page = null, pageSize = null)

        assertThat(result.items.single().changes).containsExactly(
            AuditFieldChangeItem(field = "income", oldValue = "100", newValue = "200"),
        )
    }

    // Non-household-scoped entries (users, settings) are what AUDIT_LOG was kept separate from
    // CUSTOMER for in the first place - a caller without CUSTOMER must still see those in full.
    @Test
    fun `search never redacts an entity type outside AuditScope's household scope`() {
        authenticateWith("AUDIT_LOG")
        every { auditLogRepository.findAll(any<Specification<AuditLogEntity>>(), any<Pageable>()) } returns
            PageImpl(listOf(auditEntry("""{"username": ["old", "new"]}""", entityType = "User")))

        val result = service.search(AuditSearchFilter(), page = null, pageSize = null)

        assertThat(result.items.single().changes).hasSize(1)
    }

    @Test
    fun `filter options offer every entity type and operation, and the users the log holds entries for`() {
        every { auditLogRepository.findDistinctActors() } returns listOf(
            actor("test-user", "Max", "Mustermann"),
            actor("system-job", null, null),
        )

        val result = service.getFilterOptions()

        assertThat(result.entityTypes).isEqualTo(AuditScope.allEntityTypes)
        assertThat(result.operations).isEqualTo(AuditOperation.entries)
        assertThat(result.actors.map { it.username }).containsExactly("test-user", "system-job")
        assertThat(result.actors.first().firstname).isEqualTo("Max")
        assertThat(result.actors.last().firstname).isNull()
    }

    // A user whose recorded name changed within the retention window is one option, not two.
    @Test
    fun `filter options list a user once even when the log holds two spellings of the name`() {
        every { auditLogRepository.findDistinctActors() } returns listOf(
            actor("test-user", "Max", "Mustermann"),
            actor("test-user", "Max", "Musterfrau"),
        )

        val result = service.getFilterOptions()

        assertThat(result.actors).hasSize(1)
        assertThat(result.actors.single().lastname).isEqualTo("Mustermann")
    }

    // Reading the audit trail is itself never recorded before issue #3474 - see the module README.
    @Test
    fun `filter options record a read with no business key`() {
        every { auditLogRepository.findDistinctActors() } returns emptyList()

        service.getFilterOptions()

        val entrySlot = slot<AuditLogWriter.PendingEntry>()
        verify { auditLogWriter.record(capture(entrySlot)) }
        assertThat(entrySlot.captured.entityType).isEqualTo(AuditScope.AUDIT_LOG_QUERY_ENTITY_TYPE)
        assertThat(entrySlot.captured.businessKey).isNull()
        assertThat(entrySlot.captured.operation).isEqualTo(AuditOperation.READ)
        assertThat(entrySlot.captured.changedFields).isEmpty()
    }

    private fun actor(name: String, first: String?, last: String?) = object : AuditActorProjection {
        override val username = name
        override val firstname = first
        override val lastname = last
    }

    private fun auditEntry(changedFields: String?, entityType: String = "Household") = AuditLogEntity(
        occurredAt = LocalDateTime.of(2026, 8, 9, 12, 0),
        entityType = entityType,
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
