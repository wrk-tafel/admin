package at.wrk.tafel.admin.backend.database.model.person

import org.springframework.data.jpa.repository.JpaRepository

interface PersonRepository : JpaRepository<PersonEntity, Long> {

    fun findAllByHouseholdId(householdId: Long): List<PersonEntity>

}
