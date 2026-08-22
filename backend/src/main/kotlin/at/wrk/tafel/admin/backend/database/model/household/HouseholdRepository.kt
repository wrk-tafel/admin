package at.wrk.tafel.admin.backend.database.model.household

import org.springframework.data.domain.Sort
import org.springframework.data.jpa.domain.Specification
import org.springframework.data.jpa.repository.EntityGraph
import org.springframework.data.jpa.repository.JpaRepository
import org.springframework.data.jpa.repository.JpaSpecificationExecutor
import org.springframework.data.jpa.repository.Query
import java.time.LocalDate
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
     * Overrides the inherited `findAll(Specification, Sort)` with an eager fetch of `persons`.
     * Without this, income-validating each household in
     * `HouseholdService.getHouseholdsAboveLimit()` would trigger one extra query per household -
     * that caller loads every valid household up front rather than a paginated slice, so the N+1
     * cost would otherwise be unbounded. An eager fetch is only safe here because the query is
     * unpaginated: a collection fetch combined with a `Pageable` would make Hibernate paginate in
     * memory over the whole result.
     */
    @EntityGraph(attributePaths = ["persons"])
    override fun findAll(spec: Specification<HouseholdEntity>, sort: Sort): List<HouseholdEntity>

    fun existsByHouseholdId(id: Long): Boolean

    fun getReferenceByHouseholdId(id: Long): HouseholdEntity

    fun findByHouseholdId(householdId: Long): HouseholdEntity?

    @EntityGraph(attributePaths = ["persons"])
    fun findAllByCreatedAtBetween(fromDate: LocalDateTime, toDate: LocalDateTime): List<HouseholdEntity>

    @EntityGraph(attributePaths = ["persons"])
    fun findAllByProlongedAtBetween(fromDate: LocalDateTime, toDate: LocalDateTime): List<HouseholdEntity>

    fun countByUpdatedAtBetween(fromDate: LocalDateTime, toDate: LocalDateTime): Int

    /**
     * Every household still entitled today and not locked - what the dashboard's "Kunden gesamt"
     * tile shows while no distribution is active. `date` is a parameter rather than `CURRENT_DATE`
     * baked into the query so the count stays testable with a fixed reference date.
     */
    fun countByLockedFalseAndValidUntilGreaterThanEqual(date: LocalDate): Int
}
