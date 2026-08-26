package at.wrk.tafel.admin.backend.modules.household

import at.wrk.tafel.admin.backend.common.export.ExportFileResult
import at.wrk.tafel.admin.backend.modules.household.internal.HouseholdExportService
import at.wrk.tafel.admin.backend.modules.household.internal.HouseholdService
import org.springframework.stereotype.Service

/**
 * The cross-module surface the central data-subject-request screen (issue #3396) triggers a
 * household's own export/delete through, without reaching into this module's `.internal` package -
 * Spring Modulith never exposes an `.internal` type to another module, named interface or not.
 */
@Service
class HouseholdDataSubjectFacade(
    private val householdService: HouseholdService,
    private val householdExportService: HouseholdExportService,
) {

    fun export(householdId: Long): ExportFileResult? = householdExportService.exportHousehold(householdId)
        ?.let { ExportFileResult(filename = it.filename, bytes = it.bytes) }

    fun delete(householdId: Long): Boolean {
        if (!householdService.existsByHouseholdId(householdId)) {
            return false
        }

        householdService.deleteHouseholdByHouseholdId(householdId)
        return true
    }
}
