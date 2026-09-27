package at.wrk.tafel.admin.backend.modules.household.internal.note

import at.wrk.tafel.admin.backend.common.api.PaginationDefaults
import at.wrk.tafel.admin.backend.common.auth.model.TafelJwtAuthentication
import at.wrk.tafel.admin.backend.database.model.auth.UserEntity
import at.wrk.tafel.admin.backend.database.model.auth.UserRepository
import at.wrk.tafel.admin.backend.database.model.household.HouseholdNoteEntity
import at.wrk.tafel.admin.backend.database.model.household.HouseholdNoteRepository
import at.wrk.tafel.admin.backend.database.model.household.HouseholdRepository
import at.wrk.tafel.admin.backend.modules.base.exception.NotFoundException
import at.wrk.tafel.admin.backend.modules.base.exception.TafelApiException
import org.springframework.data.domain.PageRequest
import org.springframework.http.HttpStatus
import org.springframework.security.core.context.SecurityContextHolder
import org.springframework.stereotype.Service

@Service
class HouseholdNoteService(
    private val householdNoteRepository: HouseholdNoteRepository,
    private val householdRepository: HouseholdRepository,
    private val userRepository: UserRepository,
) {

    fun getNotes(householdId: Long, page: Int?, pageSize: Int? = null): HouseholdNoteSearchResult {
        val pageRequest = PageRequest.of(PaginationDefaults.resolvePageIndex(page), PaginationDefaults.resolvePageSize(pageSize))
        val pagedResult =
            householdNoteRepository.findAllByHouseholdHouseholdIdOrderByCreatedAtDescIdDesc(householdId, pageRequest)
        val currentUserId = currentUserId()

        return HouseholdNoteSearchResult(
            items = pagedResult.map { mapNote(it, currentUserId) }.toList(),
            totalCount = pagedResult.totalElements,
            currentPage = page ?: 1,
            totalPages = pagedResult.totalPages,
            pageSize = pageRequest.pageSize,
        )
    }

    /**
     * The unpaged counterpart to [getNotes] - every note for a household, not one page of them. Used
     * by `HouseholdExportService` for the GDPR data export (issue #3179), where a page-size cap
     * would silently truncate the record.
     */
    fun getAllNotes(householdId: Long): List<HouseholdNoteItem> {
        val currentUserId = currentUserId()
        return householdNoteRepository.findAllByHouseholdHouseholdIdOrderByCreatedAtDescIdDesc(householdId).map { mapNote(it, currentUserId) }
    }

    /**
     * A note's author is always set on creation (see [createNewNote]), so a missing [HouseholdNoteEntity.author]
     * here only ever means that account has since been deleted - the reference is
     * `on delete set null` (`household_notes.author_user_id`).
     * [editable] mirrors what [updateNote]/[deleteNote] would allow, so the "Alle Notizen anzeigen" dialog can
     * hide the pencil/bin for a note it may not touch instead of only failing after the fact.
     */
    private fun mapNote(entity: HouseholdNoteEntity, currentUserId: Long?): HouseholdNoteItem {
        val author = entity.author
        val userDisplayString = author?.let { "${it.personnelNumber} ${it.firstname} ${it.lastname}" } ?: "Mitarbeiter gelöscht"

        return HouseholdNoteItem(
            id = entity.id!!,
            author = userDisplayString,
            timestamp = entity.createdAt!!,
            note = entity.note,
            editable = author?.id != null && author.id == currentUserId,
        )
    }

    fun createNewNote(householdId: Long, note: String): HouseholdNoteItem {
        val household = householdRepository.findByHouseholdId(householdId)
            ?: throw NotFoundException("Kunde Nr. $householdId nicht vorhanden!")

        val authenticatedUser = currentAuthenticatedUser()
        val noteEntity = HouseholdNoteEntity(household = household, note = note)
        noteEntity.author = authenticatedUser

        val savedEntity = householdNoteRepository.save(noteEntity)
        return mapNote(savedEntity, authenticatedUser.id)
    }

    fun updateNote(householdId: Long, noteId: Long, note: String): HouseholdNoteItem {
        val noteEntity = findNote(householdId, noteId)
        val currentUserId = currentUserId()
        requireOwnNote(noteEntity, currentUserId)
        noteEntity.note = note

        val savedEntity = householdNoteRepository.save(noteEntity)
        return mapNote(savedEntity, currentUserId)
    }

    fun deleteNote(householdId: Long, noteId: Long) {
        val noteEntity = findNote(householdId, noteId)
        requireOwnNote(noteEntity, currentUserId())
        householdNoteRepository.delete(noteEntity)
    }

    private fun findNote(householdId: Long, noteId: Long) = householdNoteRepository.findByIdAndHouseholdHouseholdId(noteId, householdId)
        ?: throw NotFoundException("Notiz Nr. $noteId nicht vorhanden!")

    /**
     * A note may only be corrected or erased by the user who wrote it (Art. 16/17 gap G21) -
     * unlike [findNote]'s household scoping, this isn't a lookup filter, since the note still needs
     * to 404 by household first and only then reveal (via 403) that it exists but belongs to someone
     * else.
     */
    private fun requireOwnNote(noteEntity: HouseholdNoteEntity, currentUserId: Long?) {
        if (currentUserId == null || noteEntity.author?.id != currentUserId) {
            throw TafelApiException(
                HttpStatus.FORBIDDEN,
                "Notizen können nur von der Person bearbeitet oder gelöscht werden, die sie verfasst hat!",
            )
        }
    }

    private fun currentAuthenticatedUser(): UserEntity {
        val authenticatedUser = SecurityContextHolder.getContext().authentication as TafelJwtAuthentication
        return userRepository.findByUsername(authenticatedUser.username!!)!!
    }

    private fun currentUserId(): Long? = currentAuthenticatedUser().id
}
