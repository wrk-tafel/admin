package at.wrk.tafel.admin.backend.modules.settings

import at.wrk.tafel.admin.backend.modules.settings.internal.PendingDeletionsService
import at.wrk.tafel.admin.backend.modules.settings.model.PendingDeletionsResponse
import org.springframework.security.access.prepost.PreAuthorize
import org.springframework.web.bind.annotation.GetMapping
import org.springframework.web.bind.annotation.RequestMapping
import org.springframework.web.bind.annotation.RestController

/**
 * The "Anstehende Löschungen" screen: what the retention jobs will delete soon. Behind `SETTINGS` like
 * the rest of the module; which sections come back depends on the caller's area permissions, see
 * [PendingDeletionsService].
 */
@RestController
@RequestMapping("/api/settings/pending-deletions")
@PreAuthorize("hasAuthority('SETTINGS')")
class PendingDeletionsController(
    private val pendingDeletionsService: PendingDeletionsService,
) {

    @GetMapping
    fun getPendingDeletions(): PendingDeletionsResponse = pendingDeletionsService.getPendingDeletions()
}
