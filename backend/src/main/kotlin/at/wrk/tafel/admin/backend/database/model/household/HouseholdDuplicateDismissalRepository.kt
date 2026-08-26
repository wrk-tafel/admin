package at.wrk.tafel.admin.backend.database.model.household

import org.springframework.data.jpa.repository.JpaRepository
import org.springframework.data.jpa.repository.Modifying
import org.springframework.data.jpa.repository.Query
import org.springframework.data.repository.query.Param

interface HouseholdDuplicateDismissalRepository : JpaRepository<HouseholdDuplicateDismissalEntity, Long> {

    fun existsByHouseholdIdLowAndHouseholdIdHigh(householdIdLow: Long, householdIdHigh: Long): Boolean

    /**
     * Removes every dismissal naming [householdId] on either side of the pair, as part of
     * `HouseholdService.deleteHouseholdByHouseholdId` - the table deliberately has no foreign key
     * (see `R__00102_household_duplicate_dismissals.sql`), so nothing else would ever clean up a
     * dismissal for a household that no longer exists.
     */
    @Modifying
    @Query("delete from HouseholdDuplicateDismissal d where d.householdIdLow = :householdId or d.householdIdHigh = :householdId")
    fun deleteByHouseholdId(@Param("householdId") householdId: Long): Int
}
