package at.wrk.tafel.admin.backend.architecture.options

import com.tngtech.archunit.core.importer.ImportOption
import com.tngtech.archunit.core.importer.Location

class ExcludeDbMigrationImportOption : ImportOption {

    override fun includes(location: Location): Boolean {
        return !location.contains("at/wrk/tafel/admin/backend/database/migration")
    }

}
