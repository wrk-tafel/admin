package at.wrk.tafel.admin.backend.modules.settings

import at.wrk.tafel.admin.backend.modules.settings.internal.PendingDeletionsService
import at.wrk.tafel.admin.backend.modules.settings.model.PendingEmployeeDeletionListResponse
import at.wrk.tafel.admin.backend.modules.settings.model.PendingHouseholdDeletionListResponse
import at.wrk.tafel.admin.backend.modules.settings.model.PendingUserDeletionListResponse
import org.springframework.security.access.prepost.PreAuthorize
import org.springframework.web.bind.annotation.GetMapping
import org.springframework.web.bind.annotation.RequestMapping
import org.springframework.web.bind.annotation.RequestParam
import org.springframework.web.bind.annotation.RestController

/**
 * The "Anstehende Löschungen" screen: what the retention jobs will delete soon, one paged list per
 * kind of record. Behind `SETTINGS` like the rest of the module; each list additionally needs the
 * permission of its area (403 otherwise), see [PendingDeletionsService].
 */
@RestController
@RequestMapping("/api/settings/pending-deletions")
@PreAuthorize("hasAuthority('SETTINGS')")
class PendingDeletionsController(
    private val pendingDeletionsService: PendingDeletionsService,
) {

    @GetMapping("/users")
    fun getPendingUserDeletions(
        @RequestParam(required = false) page: Int?,
        @RequestParam(required = false) pageSize: Int?,
    ): PendingUserDeletionListResponse = pendingDeletionsService.getPendingUserDeletions(page, pageSize)

    @GetMapping("/households")
    fun getPendingHouseholdDeletions(
        @RequestParam(required = false) page: Int?,
        @RequestParam(required = false) pageSize: Int?,
    ): PendingHouseholdDeletionListResponse = pendingDeletionsService.getPendingHouseholdDeletions(page, pageSize)

    @GetMapping("/employees")
    fun getPendingEmployeeDeletions(
        @RequestParam(required = false) page: Int?,
        @RequestParam(required = false) pageSize: Int?,
    ): PendingEmployeeDeletionListResponse = pendingDeletionsService.getPendingEmployeeDeletions(page, pageSize)
}
