package at.wrk.tafel.admin.backend.dbmodel.common

import org.springframework.data.domain.Persistable
import javax.persistence.Column
import javax.persistence.Id
import javax.persistence.MappedSuperclass

@MappedSuperclass
abstract class BaseEntity(
    @Id
    @Column(name = "id", nullable = false)
    private var id: Long? = null
) : Persistable<Long?> {

    override fun getId(): Long? {
        return id
    }

    override fun isNew(): Boolean {
        return id == null
    }

    override fun toString(): String {
        return "BaseIdEntity(id=$id, isNew=$isNew)"
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
