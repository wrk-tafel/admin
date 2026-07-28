package at.wrk.tafel.admin.backend.database.model.person

import org.springframework.data.domain.Page
import org.springframework.data.domain.Pageable
import org.springframework.data.jpa.domain.Specification
import org.springframework.data.jpa.repository.EntityGraph
import org.springframework.data.jpa.repository.JpaRepository
import org.springframework.data.jpa.repository.JpaSpecificationExecutor

interface PersonRepository :
    JpaRepository<PersonEntity, Long>,
    JpaSpecificationExecutor<PersonEntity> {

    fun findAllByHouseholdId(householdId: Long): List<PersonEntity>

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
}
