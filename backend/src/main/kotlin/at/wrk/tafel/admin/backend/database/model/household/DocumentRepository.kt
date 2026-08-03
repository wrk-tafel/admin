package at.wrk.tafel.admin.backend.database.model.household

import org.springframework.data.jpa.repository.JpaRepository
import org.springframework.data.jpa.repository.Query

interface DocumentRepository : JpaRepository<DocumentEntity, Long> {

    fun findAllByHouseholdHouseholdIdOrderByCreatedAtDesc(householdId: Long): List<DocumentEntity>

    fun findByIdAndHouseholdHouseholdId(id: Long, householdId: Long): DocumentEntity?

    /**
     * Used by [at.wrk.tafel.admin.backend.modules.household.internal.document.DocumentStorageCleanupService]
     * to find files on disk that no longer have a DB row - a plain column projection instead of
     * loading full entities since only the path is needed.
     */
    @Query("select d.storagePath from Document d")
    fun findAllStoragePaths(): List<String>
}
