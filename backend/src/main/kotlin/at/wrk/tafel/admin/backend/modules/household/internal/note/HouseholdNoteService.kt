package at.wrk.tafel.admin.backend.modules.household.internal.note

import at.wrk.tafel.admin.backend.common.api.PaginationDefaults
import at.wrk.tafel.admin.backend.common.auth.model.TafelJwtAuthentication
import at.wrk.tafel.admin.backend.database.model.auth.UserRepository
import at.wrk.tafel.admin.backend.database.model.household.HouseholdNoteEntity
import at.wrk.tafel.admin.backend.database.model.household.HouseholdNoteRepository
import at.wrk.tafel.admin.backend.database.model.household.HouseholdRepository
import at.wrk.tafel.admin.backend.modules.base.exception.NotFoundException
import org.springframework.data.domain.PageRequest
import org.springframework.security.core.context.SecurityContextHolder
import org.springframework.stereotype.Service

@Service
class HouseholdNoteService(
    private val householdNoteRepository: HouseholdNoteRepository,
    private val householdRepository: HouseholdRepository,
    private val userRepository: UserRepository,
) {

    fun getNotes(householdId: Long, page: Int?, pageSize: Int? = null): HouseholdNoteSearchResult {
        val pageRequest = PageRequest.of(page?.minus(1) ?: 0, PaginationDefaults.resolvePageSize(pageSize))
        val pagedResult =
            householdNoteRepository.findAllByHouseholdHouseholdIdOrderByCreatedAtDescIdDesc(householdId, pageRequest)

        return HouseholdNoteSearchResult(
            items = pagedResult.map { mapNote(it) }.toList(),
            totalCount = pagedResult.totalElements,
            currentPage = page ?: 1,
            totalPages = pagedResult.totalPages,
            pageSize = pageRequest.pageSize,
        )
    }

    /**
     * A note's author is always set on creation (see [createNewNote]), so a missing [HouseholdNoteEntity.employee]
     * here only ever means that employee has since been deleted - employees are personal data and stay
     * deletable even once referenced by a note (`household_notes.employee_id` is `on delete set null`).
     */
    private fun mapNote(entity: HouseholdNoteEntity): HouseholdNoteItem {
        val employee = entity.employee
        val userDisplayString = employee?.let { "${it.personnelNumber} ${it.firstname} ${it.lastname}" } ?: "Mitarbeiter gelöscht"

        return HouseholdNoteItem(
            id = entity.id!!,
            author = userDisplayString,
            timestamp = entity.createdAt!!,
            note = entity.note,
        )
    }

    fun createNewNote(householdId: Long, note: String): HouseholdNoteItem {
        val authenticatedUser = SecurityContextHolder.getContext().authentication as TafelJwtAuthentication
        val household = householdRepository.findByHouseholdId(householdId)
            ?: throw NotFoundException("Kunde Nr. $householdId nicht vorhanden!")

        val noteEntity = HouseholdNoteEntity(household = household, note = note)
        noteEntity.employee = userRepository.findByUsername(authenticatedUser.username!!)!!.employee

        val savedEntity = householdNoteRepository.save(noteEntity)
        return mapNote(savedEntity)
    }
}
