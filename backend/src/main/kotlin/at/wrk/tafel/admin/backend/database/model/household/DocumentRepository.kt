package at.wrk.tafel.admin.backend.database.model.household

import org.springframework.data.jpa.repository.JpaRepository

interface DocumentRepository : JpaRepository<DocumentEntity, Long> {

    fun findAllByHouseholdHouseholdIdOrderByCreatedAtDesc(householdId: Long): List<DocumentEntity>

    fun findByIdAndHouseholdHouseholdId(id: Long, householdId: Long): DocumentEntity?
}
