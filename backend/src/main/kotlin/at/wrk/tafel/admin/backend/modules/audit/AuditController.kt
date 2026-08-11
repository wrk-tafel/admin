package at.wrk.tafel.admin.backend.modules.audit

import at.wrk.tafel.admin.backend.common.api.PagedResponse
import at.wrk.tafel.admin.backend.database.common.audit.AuditOperation
import at.wrk.tafel.admin.backend.modules.audit.internal.AuditService
import org.springframework.format.annotation.DateTimeFormat
import org.springframework.security.access.prepost.PreAuthorize
import org.springframework.web.bind.annotation.GetMapping
import org.springframework.web.bind.annotation.PathVariable
import org.springframework.web.bind.annotation.RequestMapping
import org.springframework.web.bind.annotation.RequestParam
import org.springframework.web.bind.annotation.RestController
import java.time.LocalDate

/**
 * Read-only by design - there is no endpoint that writes, edits or deletes an entry, and adding one
 * would make the trail worth less than not having it. Entries appear as a side effect of the changes
 * they describe, and leave only by ageing out (`AuditRetentionService`).
 */
@RestController
@RequestMapping("/api/audit")
@PreAuthorize("hasAuthority('AUDIT_LOG')")
class AuditController(
    private val auditService: AuditService,
) {

    @GetMapping
    fun search(
        @RequestParam("entityType") entityType: String?,
        @RequestParam("operation") operation: AuditOperation?,
        @RequestParam("actorUsername") actorUsername: String?,
        @RequestParam("businessKey") businessKey: String?,
        @RequestParam("from") @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) from: LocalDate?,
        @RequestParam("to") @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) to: LocalDate?,
        @RequestParam("page") page: Int?,
        @RequestParam("pageSize") pageSize: Int?,
    ): PagedResponse<AuditEntryItem> = auditService.search(
        filter = AuditSearchFilter(
            entityType = entityType?.takeIf { it.isNotBlank() },
            operation = operation,
            actorUsername = actorUsername?.takeIf { it.isNotBlank() },
            businessKey = businessKey?.takeIf { it.isNotBlank() },
            from = from,
            to = to,
        ),
        page = page,
        pageSize = pageSize,
    )

    @GetMapping("/filter-options")
    fun getFilterOptions(): AuditFilterOptionsResponse = auditService.getFilterOptions()

    /**
     * Feeds the "Verlauf" tab. Sits under `/api/audit` rather than under
     * `/api/households/{householdId}/...` so the whole feature stays behind one permission and one
     * controller - the household module knows nothing about the audit trail.
     */
    @GetMapping("/households/{householdId}")
    fun getHouseholdHistory(
        @PathVariable householdId: Long,
        @RequestParam("page") page: Int?,
        @RequestParam("pageSize") pageSize: Int?,
    ): PagedResponse<AuditEntryItem> = auditService.getHouseholdHistory(householdId, page, pageSize)
}
