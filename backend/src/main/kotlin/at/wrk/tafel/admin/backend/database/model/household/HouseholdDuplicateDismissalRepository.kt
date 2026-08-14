package at.wrk.tafel.admin.backend.database.model.household

import org.springframework.data.jpa.repository.JpaRepository

interface HouseholdDuplicateDismissalRepository : JpaRepository<HouseholdDuplicateDismissalEntity, Long> {

    fun existsByHouseholdIdLowAndHouseholdIdHigh(householdIdLow: Long, householdIdHigh: Long): Boolean
}
