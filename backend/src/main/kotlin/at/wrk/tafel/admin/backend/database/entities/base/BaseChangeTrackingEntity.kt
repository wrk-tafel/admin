package at.wrk.tafel.admin.backend.database.entities.base

import at.wrk.tafel.admin.backend.common.ExcludeFromTestCoverage
import org.hibernate.annotations.CreationTimestamp
import org.hibernate.annotations.UpdateTimestamp
import java.time.ZonedDateTime
import jakarta.persistence.Column
import jakarta.persistence.MappedSuperclass

@MappedSuperclass
@ExcludeFromTestCoverage
abstract class BaseChangeTrackingEntity : BaseEntity() {

    @Column(name = "created_at")
    @CreationTimestamp
    open var createdAt: ZonedDateTime? = null

    @Column(name = "updated_at")
    @UpdateTimestamp
    open var updatedAt: ZonedDateTime? = null

    override fun toString(): String {
        return "BaseChangeTrackingEntity(id=$id, createdAt=$createdAt, updatedAt=$updatedAt)"
    }
}
