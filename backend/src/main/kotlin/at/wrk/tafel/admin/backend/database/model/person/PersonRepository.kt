package at.wrk.tafel.admin.backend.database.model.person

import at.wrk.tafel.admin.backend.database.model.household.HouseholdEntity
import org.springframework.data.domain.Page
import org.springframework.data.domain.Pageable
import org.springframework.data.jpa.domain.Specification
import org.springframework.data.jpa.repository.EntityGraph
import org.springframework.data.jpa.repository.JpaRepository
import org.springframework.data.jpa.repository.JpaSpecificationExecutor
import org.springframework.data.jpa.repository.Modifying
import org.springframework.data.jpa.repository.Query
import org.springframework.data.repository.query.Param
import java.time.LocalDate

interface PersonRepository :
    JpaRepository<PersonEntity, Long>,
    JpaSpecificationExecutor<PersonEntity> {

    /**
     * Overrides both inherited `findAll(Specification...)` variants with an eager fetch of
     * `household`, matching `HouseholdRepository.findAll(Specification)`'s reasoning - callers here
     * (`StatisticsService`) read `household.householdId` off every result row, which would
     * otherwise trigger one extra query per person.
     */
    @EntityGraph(attributePaths = ["household"])
    override fun findAll(spec: Specification<PersonEntity>): List<PersonEntity>

    @EntityGraph(attributePaths = ["household"])
    override fun findAll(spec: Specification<PersonEntity>, pageable: Pageable): Page<PersonEntity>

    /**
     * Re-parents kept (non-duplicate) persons onto [targetHousehold] as part of a household merge
     * (see `HouseholdMergeService`). Forces `isMainPerson = false` in the same statement - a partial
     * unique index enforces exactly one main person per household, so moving a source's main person
     * across with the flag still set would violate it immediately.
     *
     * A bulk `@Modifying` update (rather than loading + saving entities) is deliberate: touching
     * `HouseholdEntity.persons` in memory - even just removing an element from a source's collection
     * - would schedule an orphan-removal DELETE for a row we're simultaneously trying to keep.
     * `clearAutomatically` detaches the persistence context so the source household is re-read fresh
     * (and genuinely childless) before it gets deleted.
     *
     * @param personIds `persons.id` (entity primary keys) - never the business `householdId`.
     */
    @Modifying(flushAutomatically = true, clearAutomatically = true)
    @Query("update Person p set p.household = :targetHousehold, p.isMainPerson = false where p.id in :personIds")
    fun reassignToHousehold(
        @Param("targetHousehold") targetHousehold: HouseholdEntity,
        @Param("personIds") personIds: Collection<Long>,
    ): Int

    /**
     * Everyone a currently entitled, unlocked household gets food for - what the dashboard's
     * "Personen gesamt" tile shows while no distribution is active. Same formula as
     * `DashboardService.getRegisteredPersons`/the customer-list PDF: excluded additional persons
     * don't count. `date` is a parameter rather than `CURRENT_DATE` baked into the query so the
     * count stays testable with a fixed reference date.
     */
    @Query(
        "select count(p) from Person p join p.household h " +
            "where h.locked = false and h.validUntil >= :date and p.excludeFromHousehold = false",
    )
    fun countActive(@Param("date") date: LocalDate): Int

    /**
     * Persons ever assigned to each country, regardless of household validity - powers the
     * "frequently used" grouping in the nationality autocomplete (`CountryService.listCountries`),
     * which is meant to reflect what staff actually type rather than only the current snapshot.
     */
    @Query("select p.country.id as countryId, count(p) as usageCount from Person p group by p.country.id")
    fun countPersonsByCountry(): List<CountryUsageCount>
}

/** One country's person count, as [PersonRepository.countPersonsByCountry] reads them. */
interface CountryUsageCount {
    val countryId: Long
    val usageCount: Long
}
