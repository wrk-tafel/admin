package at.wrk.tafel.admin.backend.database.model.household

import org.springframework.data.domain.Page
import org.springframework.data.domain.PageRequest
import org.springframework.data.jpa.repository.JpaRepository

interface HouseholdNoteRepository : JpaRepository<HouseholdNoteEntity, Long> {

    fun findAllByHouseholdHouseholdIdOrderByCreatedAtDescIdDesc(
        householdId: Long,
        pageRequest: PageRequest,
    ): Page<HouseholdNoteEntity>
}
