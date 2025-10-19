package at.wrk.tafel.admin.backend.database.common.lock

import org.springframework.data.jpa.repository.JpaRepository
import org.springframework.data.jpa.repository.Query
import org.springframework.data.repository.query.Param
import org.springframework.stereotype.Repository

@Repository
interface AdvisoryLockRepository : JpaRepository<AdvisoryLockEntity, Long> {

    @Query(value = "SELECT pg_advisory_xact_lock(:lockId)", nativeQuery = true)
    fun acquireLock(@Param("lockId") lockId: Long): Any?

    @Query(value = "SELECT pg_try_advisory_xact_lock(:lockId)", nativeQuery = true)
    fun tryAcquireLock(@Param("lockId") lockId: Long): Boolean?

    @Query(value = "SELECT pg_advisory_unlock(:lockId)", nativeQuery = true)
    fun releaseLock(@Param("lockId") lockId: Long): Any?

}
