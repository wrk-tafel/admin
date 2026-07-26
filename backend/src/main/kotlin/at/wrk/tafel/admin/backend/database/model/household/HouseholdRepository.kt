package at.wrk.tafel.admin.backend.database.model.household

import org.springframework.data.jpa.repository.JpaRepository
import org.springframework.data.jpa.repository.JpaSpecificationExecutor
import org.springframework.data.jpa.repository.Query
import java.time.LocalDate
import java.time.LocalDateTime

interface HouseholdRepository : JpaRepository<HouseholdEntity, Long>, JpaSpecificationExecutor<HouseholdEntity> {

    @Query("SELECT nextval('household_id_sequence')", nativeQuery = true)
    fun getNextHouseholdSequenceValue(): Long

    fun existsByHouseholdId(id: Long): Boolean

    fun getReferenceByHouseholdId(id: Long): HouseholdEntity

    fun findByHouseholdId(householdId: Long): HouseholdEntity?

    fun deleteByHouseholdId(householdId: Long)

    fun findAllByCreatedAtBetween(fromDate: LocalDateTime, toDate: LocalDateTime): List<HouseholdEntity>

    fun findAllByProlongedAtBetween(fromDate: LocalDateTime, toDate: LocalDateTime): List<HouseholdEntity>

    fun countByUpdatedAtBetween(fromDate: LocalDateTime, toDate: LocalDateTime): Int

    fun findByValidUntilAfter(fromDate: LocalDate): List<HouseholdEntity>

}
