package at.wrk.tafel.admin.backend.database.common.lock

import org.springframework.data.jpa.repository.JpaRepository
import org.springframework.data.jpa.repository.Query
import org.springframework.data.repository.query.Param
import org.springframework.stereotype.Repository

/**
 * Both functions take a **transaction-level** advisory lock, which PostgreSQL releases on its own
 * when the surrounding transaction commits or rolls back. There is deliberately no release query:
 * `pg_advisory_unlock` only ever releases *session*-level locks, so calling it for these locks
 * releases nothing and makes the server log `you don't own a lock of type ExclusiveLock`.
 */
@Repository
interface AdvisoryLockRepository : JpaRepository<AdvisoryLockEntity, Long> {

    @Query(value = "SELECT pg_advisory_xact_lock(:lockId)", nativeQuery = true)
    fun acquireLock(@Param("lockId") lockId: Long): Any?

    @Query(value = "SELECT pg_try_advisory_xact_lock(:lockId)", nativeQuery = true)
    fun tryAcquireLock(@Param("lockId") lockId: Long): Boolean?
}
