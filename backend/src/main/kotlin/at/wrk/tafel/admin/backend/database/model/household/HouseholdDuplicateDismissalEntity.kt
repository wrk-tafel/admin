package at.wrk.tafel.admin.backend.database.model.household

import at.wrk.tafel.admin.backend.common.ExcludeFromTestCoverage
import at.wrk.tafel.admin.backend.database.model.base.BaseChangeTrackingEntity
import jakarta.persistence.Column
import jakarta.persistence.Entity
import jakarta.persistence.Table

@Entity(name = "HouseholdDuplicateDismissal")
@Table(name = "household_duplicate_dismissals")
@ExcludeFromTestCoverage
class HouseholdDuplicateDismissalEntity(
    @Column(name = "household_id_low")
    var householdIdLow: Long,
    @Column(name = "household_id_high")
    var householdIdHigh: Long,
) : BaseChangeTrackingEntity()
