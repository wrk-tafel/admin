package at.wrk.tafel.admin.backend.modules.household.internal.note

import at.wrk.tafel.admin.backend.common.auth.model.TafelJwtAuthentication
import at.wrk.tafel.admin.backend.database.model.auth.UserRepository
import at.wrk.tafel.admin.backend.database.model.household.HouseholdNoteEntity
import at.wrk.tafel.admin.backend.database.model.household.HouseholdNoteRepository
import at.wrk.tafel.admin.backend.database.model.household.HouseholdRepository
import org.springframework.data.domain.PageRequest
import org.springframework.security.core.context.SecurityContextHolder
import org.springframework.stereotype.Service

@Service
class HouseholdNoteService(
    private val householdNoteRepository: HouseholdNoteRepository,
    private val householdRepository: HouseholdRepository,
    private val userRepository: UserRepository,
) {

    fun getNotes(householdId: Long, page: Int?): HouseholdNoteSearchResult {
        val pageRequest = PageRequest.of(page?.minus(1) ?: 0, 5)
        val pagedResult =
            householdNoteRepository.findAllByHouseholdHouseholdIdOrderByCreatedAtDesc(householdId, pageRequest)

        return HouseholdNoteSearchResult(
            items = pagedResult.map { mapNote(it) }.toList(),
            totalCount = pagedResult.totalElements,
            currentPage = page ?: 1,
            totalPages = pagedResult.totalPages,
            pageSize = pageRequest.pageSize
        )
    }

    private fun mapNote(entity: HouseholdNoteEntity): HouseholdNoteItem {
        val employee = entity.employee
        val userDisplayString = listOfNotNull(employee?.personnelNumber, employee?.firstname, employee?.lastname)
            .joinToString(" ")
            .ifBlank { null }

        return HouseholdNoteItem(
            author = userDisplayString,
            timestamp = entity.createdAt!!,
            note = entity.note!!
        )
    }

    fun createNewNote(householdId: Long, note: String): HouseholdNoteItem {
        val authenticatedUser = SecurityContextHolder.getContext().authentication as TafelJwtAuthentication

        val noteEntity = HouseholdNoteEntity()
        noteEntity.household = householdRepository.findByHouseholdId(householdId)
        noteEntity.employee = userRepository.findByUsername(authenticatedUser.username!!)!!.employee
        noteEntity.note = note

        val savedEntity = householdNoteRepository.save(noteEntity)
        return mapNote(savedEntity)
    }

}
