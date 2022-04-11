package at.wrk.tafel.admin.backend.database.entities.base

import at.wrk.tafel.admin.backend.common.ExcludeFromTestCoverage
import javax.persistence.Column
import javax.persistence.GeneratedValue
import javax.persistence.Id
import javax.persistence.MappedSuperclass

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
        if (id != other.id) return false
        return true
    }

    override fun hashCode(): Int {
        return id?.hashCode() ?: 0
    }
}
