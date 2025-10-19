package at.wrk.tafel.admin.backend.database.common.lock

import at.wrk.tafel.admin.backend.common.ExcludeFromTestCoverage
import jakarta.persistence.Entity
import jakarta.persistence.Id
import jakarta.persistence.Table

@Entity
@Table(name = "pg_locks")
@ExcludeFromTestCoverage
class AdvisoryLockEntity {
    @Id
    var pid: Long? = null
}
