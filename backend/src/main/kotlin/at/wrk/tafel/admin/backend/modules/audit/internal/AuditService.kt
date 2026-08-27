package at.wrk.tafel.admin.backend.modules.audit.internal

import at.wrk.tafel.admin.backend.common.api.PagedResponse
import at.wrk.tafel.admin.backend.common.api.PaginationDefaults
import at.wrk.tafel.admin.backend.common.auth.model.TafelJwtAuthentication
import at.wrk.tafel.admin.backend.database.common.audit.AuditOperation
import at.wrk.tafel.admin.backend.database.common.audit.AuditScope
import at.wrk.tafel.admin.backend.database.model.audit.AuditLogEntity
import at.wrk.tafel.admin.backend.database.model.audit.AuditLogRepository
import at.wrk.tafel.admin.backend.modules.audit.AuditActorItem
import at.wrk.tafel.admin.backend.modules.audit.AuditEntryItem
import at.wrk.tafel.admin.backend.modules.audit.AuditFieldChangeItem
import at.wrk.tafel.admin.backend.modules.audit.AuditFilterOptionsResponse
import at.wrk.tafel.admin.backend.modules.audit.AuditSearchFilter
import org.slf4j.LoggerFactory
import org.springframework.data.domain.Page
import org.springframework.data.domain.PageRequest
import org.springframework.data.domain.Sort
import org.springframework.data.jpa.domain.Specification
import org.springframework.security.core.context.SecurityContextHolder
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional
import tools.jackson.databind.json.JsonMapper

@Service
class AuditService(
    private val auditLogRepository: AuditLogRepository,
    private val jsonMapper: JsonMapper,
) {

    companion object {
        private val logger = LoggerFactory.getLogger(AuditService::class.java)
    }

    /**
     * One household's history, across every entity type that belongs to it - the household row
     * itself, its persons, notes and documents. Filtering on the type set as well as the key is what
     * keeps a user account whose username happens to be a number out of a household's history.
     */
    @Transactional(readOnly = true)
    fun getHouseholdHistory(householdId: Long, page: Int?, pageSize: Int?): PagedResponse<AuditEntryItem> {
        val pageRequest = PageRequest.of(page?.minus(1) ?: 0, PaginationDefaults.resolvePageSize(pageSize))
        val result = auditLogRepository.findAllByBusinessKeyAndEntityTypeInOrderByOccurredAtDescIdDesc(
            businessKey = householdId.toString(),
            entityTypes = AuditScope.householdScopedEntityTypes,
            pageable = pageRequest,
        )
        return toPagedResponse(result, page)
    }

    /**
     * What the administration screen's filters offer. The entity types and operations are the
     * complete sets the log can ever hold; the actors are only those it actually does - see
     * [AuditLogRepository.findDistinctActors].
     */
    @Transactional(readOnly = true)
    fun getFilterOptions(): AuditFilterOptionsResponse = AuditFilterOptionsResponse(
        entityTypes = AuditScope.allEntityTypes,
        operations = AuditOperation.entries,
        actors = auditLogRepository.findDistinctActors()
            .distinctBy { it.username }
            .map { AuditActorItem(username = it.username, firstname = it.firstname, lastname = it.lastname) },
    )

    /**
     * The administration screen. Every filter is optional; with none given this is simply the whole
     * log, newest first.
     */
    @Transactional(readOnly = true)
    fun search(filter: AuditSearchFilter, page: Int?, pageSize: Int?): PagedResponse<AuditEntryItem> {
        val pageRequest = PageRequest.of(
            page?.minus(1) ?: 0,
            PaginationDefaults.resolvePageSize(pageSize),
            // Tie-broken on the id so paging stays stable when two entries share a timestamp -
            // every entry written by one transaction does, since they are stamped together.
            Sort.by(Sort.Direction.DESC, "occurredAt", "id"),
        )

        val specification = Specification.allOf(
            listOfNotNull(
                filter.entityType?.let { AuditLogEntity.Specs.entityTypeEquals(it) },
                filter.operation?.let { AuditLogEntity.Specs.operationEquals(it) },
                filter.actorUsername?.let { AuditLogEntity.Specs.actorUsernameEquals(it) },
                filter.businessKey?.let { AuditLogEntity.Specs.businessKeyEquals(it) },
                filter.from?.let { AuditLogEntity.Specs.occurredAtFrom(it.atStartOfDay()) },
                // to is genuinely nullable (LocalDate?) - this ?. is required or it.plusDays below
                // wouldn't compile. Known SonarKotlin analyzer false positive on kotlin:S6619, see
                // https://community.sonarsource.com/t/false-positive-kotlin-s6619/180347
                filter.to?.let { AuditLogEntity.Specs.occurredAtUntil(it.plusDays(1).atStartOfDay()) }, // NOSONAR
            ),
        )

        return toPagedResponse(auditLogRepository.findAll(specification, pageRequest), page)
    }

    private fun toPagedResponse(result: Page<AuditLogEntity>, page: Int?) = PagedResponse(
        items = result.content.map { mapEntry(it) },
        totalCount = result.totalElements,
        currentPage = page ?: 1,
        totalPages = result.totalPages,
        pageSize = result.size,
    )

    private fun mapEntry(entity: AuditLogEntity) = AuditEntryItem(
        id = entity.id!!,
        occurredAt = entity.occurredAt,
        actorUsername = entity.actorUsername,
        actorFirstname = entity.actorFirstname,
        actorLastname = entity.actorLastname,
        entityType = entity.entityType,
        entityId = entity.entityId,
        businessKey = entity.businessKey,
        operation = entity.operation,
        changes = if (isRedactedForCaller(entity)) emptyList() else parseChanges(entity),
    )

    /**
     * `AUDIT_LOG` alone reaches every entity type on purpose - the log spans users and settings too,
     * see the module README - but a household-scoped entry's field values are names, addresses and
     * income, the same data `CUSTOMER` gates everywhere else. A caller without it still sees *that*
     * a household/person/note/document changed, by whom and when here on the mixed `search` screen;
     * only the values are withheld. [at.wrk.tafel.admin.backend.modules.audit.AuditController.getHouseholdHistory]
     * requires `CUSTOMER` outright instead, so this never redacts anything on that path.
     */
    private fun isRedactedForCaller(entity: AuditLogEntity): Boolean {
        if (entity.entityType !in AuditScope.householdScopedEntityTypes) {
            return false
        }
        val authentication = SecurityContextHolder.getContext().authentication as? TafelJwtAuthentication
        return authentication?.hasRole("CUSTOMER") != true
    }

    /**
     * The stored document is `{"field": [old, new]}`. A row that cannot be parsed is rendered as an
     * entry with no field changes rather than failing the whole page - one malformed row from an
     * older format must not make the screen unusable.
     */
    private fun parseChanges(entity: AuditLogEntity): List<AuditFieldChangeItem> {
        val document = entity.changedFields?.takeIf { it.isNotBlank() } ?: return emptyList()
        return runCatching {
            val parsed: Map<String, List<Any?>> = jsonMapper.readValue(
                document,
                jsonMapper.typeFactory
                    .constructMapType(LinkedHashMap::class.java, String::class.java, List::class.java),
            )
            parsed.map { (field, values) ->
                AuditFieldChangeItem(
                    field = field,
                    oldValue = values.getOrNull(0)?.toString(),
                    newValue = values.getOrNull(1)?.toString(),
                )
            }.sortedBy { it.field }
        }.onFailure {
            logger.warn("Could not read the changed fields of audit entry {}", entity.id, it)
        }.getOrDefault(emptyList())
    }
}
