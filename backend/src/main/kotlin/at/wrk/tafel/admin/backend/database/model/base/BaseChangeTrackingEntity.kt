package at.wrk.tafel.admin.backend.database.model.base

import at.wrk.tafel.admin.backend.common.ExcludeFromTestCoverage
import jakarta.persistence.Column
import jakarta.persistence.MappedSuperclass
import org.hibernate.annotations.CreationTimestamp
import org.hibernate.annotations.UpdateTimestamp
import java.time.LocalDateTime


@MappedSuperclass
@ExcludeFromTestCoverage
abstract class BaseChangeTrackingEntity : BaseEntity() {

    @Column(name = "created_at")
    @CreationTimestamp
    open var createdAt: LocalDateTime? = null

    @Column(name = "updated_at")
    @UpdateTimestamp
    open var updatedAt: LocalDateTime? = null

    override fun toString(): String {
        return "BaseChangeTrackingEntity(id=$id, createdAt=$createdAt, updatedAt=$updatedAt)"
    }

}
