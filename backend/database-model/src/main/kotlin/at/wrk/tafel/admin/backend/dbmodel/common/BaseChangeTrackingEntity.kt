package at.wrk.tafel.admin.backend.dbmodel.common

import org.hibernate.annotations.CreationTimestamp
import org.hibernate.annotations.UpdateTimestamp
import java.time.Instant
import javax.persistence.Column
import javax.persistence.MappedSuperclass

@MappedSuperclass
abstract class BaseChangeTrackingEntity : BaseEntity() {

    @Column(name = "created_at")
    @CreationTimestamp
    val createdAt: Instant? = null

    @Column(name = "updated_at")
    @UpdateTimestamp
    val updatedAt: Instant? = null

    override fun toString(): String {
        return "BaseChangeTrackingEntity(id=$id, version=$version, createdAt=$createdAt, updatedAt=$updatedAt, isNew=$isNew)"
    }
}
