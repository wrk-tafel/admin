package at.wrk.tafel.admin.backend.database.model.household

import org.springframework.data.jpa.domain.Specification
import org.springframework.data.jpa.repository.EntityGraph
import org.springframework.data.jpa.repository.JpaRepository
import org.springframework.data.jpa.repository.JpaSpecificationExecutor
import org.springframework.data.jpa.repository.Query
import java.time.LocalDate
import java.time.LocalDateTime

interface HouseholdRepository : JpaRepository<HouseholdEntity, Long>, JpaSpecificationExecutor<HouseholdEntity> {

    @Query("SELECT nextval('household_id_sequence')", nativeQuery = true)
    fun getNextHouseholdSequenceValue(): Long

    // overrides the inherited findAll(Specification) with an eager fetch of persons - without this,
    // HouseholdConverter.mapEntityToHousehold() accessing the lazy persons collection triggers one
    // extra query per household (only used by getHouseholdsAboveLimit(), which loads every valid
    // household up front rather than a paginated slice, so the N+1 cost is otherwise unbounded)
    @EntityGraph(attributePaths = ["persons"])
    override fun findAll(spec: Specification<HouseholdEntity>): List<HouseholdEntity>

    fun existsByHouseholdId(id: Long): Boolean

    fun getReferenceByHouseholdId(id: Long): HouseholdEntity

    fun findByHouseholdId(householdId: Long): HouseholdEntity?

    fun deleteByHouseholdId(householdId: Long)

    fun findAllByCreatedAtBetween(fromDate: LocalDateTime, toDate: LocalDateTime): List<HouseholdEntity>

    fun findAllByProlongedAtBetween(fromDate: LocalDateTime, toDate: LocalDateTime): List<HouseholdEntity>

    fun countByUpdatedAtBetween(fromDate: LocalDateTime, toDate: LocalDateTime): Int

    fun findByValidUntilAfter(fromDate: LocalDate): List<HouseholdEntity>

}
