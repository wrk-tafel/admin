package at.wrk.tafel.admin.backend.database.model.base

import at.wrk.tafel.admin.backend.common.ExcludeFromTestCoverage
import jakarta.persistence.Column
import jakarta.persistence.GeneratedValue
import jakarta.persistence.Id
import jakarta.persistence.MappedSuperclass

@MappedSuperclass
@ExcludeFromTestCoverage
abstract class BaseEntity(
    @Id
    @GeneratedValue
    @Column(name = "id", nullable = false)
    open var id: Long? = null
) {
    override fun toString(): String {
        return "BaseEntity(id=$id)"
    }

    override fun equals(other: Any?): Boolean {
        if (this === other) return true
        if (javaClass != other?.javaClass) return false
        other as BaseEntity
        return id == other.id
    }

    override fun hashCode(): Int {
        return id?.hashCode() ?: 0
    }
}
