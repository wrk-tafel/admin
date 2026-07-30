package at.wrk.tafel.admin.backend.database.model.household

import org.springframework.data.jpa.domain.Specification
import org.springframework.data.jpa.repository.EntityGraph
import org.springframework.data.jpa.repository.JpaRepository
import org.springframework.data.jpa.repository.JpaSpecificationExecutor
import org.springframework.data.jpa.repository.Query
import java.time.LocalDateTime

interface HouseholdRepository :
    JpaRepository<HouseholdEntity, Long>,
    JpaSpecificationExecutor<HouseholdEntity> {

    /**
     * The human-facing `household_id` business number, drawn from a dedicated Postgres sequence -
     * distinct from the entity's own JPA-generated primary key.
     */
    @Query("SELECT nextval('household_id_sequence')", nativeQuery = true)
    fun getNextHouseholdSequenceValue(): Long

    /**
     * Overrides the inherited `findAll(Specification)` with an eager fetch of `persons`. Without
     * this, `HouseholdConverter.mapEntityToHousehold()` accessing the lazy `persons` collection
     * would trigger one extra query per household - the only caller,
     * `HouseholdService.getHouseholdsAboveLimit()`, loads every valid household up front rather
     * than a paginated slice, so the N+1 cost would otherwise be unbounded.
     */
    @EntityGraph(attributePaths = ["persons"])
    override fun findAll(spec: Specification<HouseholdEntity>): List<HouseholdEntity>

    fun existsByHouseholdId(id: Long): Boolean

    fun getReferenceByHouseholdId(id: Long): HouseholdEntity

    fun findByHouseholdId(householdId: Long): HouseholdEntity?

    fun findAllByCreatedAtBetween(fromDate: LocalDateTime, toDate: LocalDateTime): List<HouseholdEntity>

    fun findAllByProlongedAtBetween(fromDate: LocalDateTime, toDate: LocalDateTime): List<HouseholdEntity>

    fun countByUpdatedAtBetween(fromDate: LocalDateTime, toDate: LocalDateTime): Int
}
