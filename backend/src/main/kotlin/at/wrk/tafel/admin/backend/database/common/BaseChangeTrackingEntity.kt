package at.wrk.tafel.admin.backend.database.common

import org.hibernate.annotations.CreationTimestamp
import org.hibernate.annotations.UpdateTimestamp
import java.time.Instant
import javax.persistence.Column
import javax.persistence.MappedSuperclass

@MappedSuperclass
abstract class BaseChangeTrackingEntity<T>(id: T, version: Long) : BaseEntity<T>(id, version) {

    @Column(name = "created_at")
    @CreationTimestamp
    val createdAt: Instant? = null

    @Column(name = "updated_at")
    @UpdateTimestamp
    val updatedAt: Instant? = null

    override fun toString(): String {
        return "BaseChangeTrackingEntity(id=$id, version=$version, createdAt=$createdAt, updatedAt=$updatedAt, isNew=$isNew)"
    }

    override fun equals(other: Any?): Boolean {
        if (this === other) return true
        if (javaClass != other?.javaClass) return false
        other as BaseChangeTrackingEntity<*>
        if (id != other.id) return false
        return true
    }

    override fun hashCode(): Int {
        return id?.hashCode() ?: 0
    }

}
