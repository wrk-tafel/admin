package at.wrk.tafel.admin.backend.database.entities.base

import at.wrk.tafel.admin.backend.common.ExcludeFromTestCoverage
import org.hibernate.annotations.CreationTimestamp
import org.hibernate.annotations.UpdateTimestamp
import java.time.Instant
import javax.persistence.Column
import javax.persistence.MappedSuperclass

@MappedSuperclass
@ExcludeFromTestCoverage
abstract class BaseChangeTrackingEntity : BaseEntity() {

    @Column(name = "created_at")
    @CreationTimestamp
    open var createdAt: Instant? = null

    @Column(name = "updated_at")
    @UpdateTimestamp
    open var updatedAt: Instant? = null

    override fun toString(): String {
        return "BaseChangeTrackingEntity(id=$id, createdAt=$createdAt, updatedAt=$updatedAt)"
    }
}
