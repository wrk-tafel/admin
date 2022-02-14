package at.wrk.tafel.admin.backend.database.common

import org.springframework.data.domain.Persistable
import javax.persistence.Column
import javax.persistence.Id
import javax.persistence.MappedSuperclass
import javax.persistence.Version

@MappedSuperclass
abstract class BaseEntity<T>(
    @Id
    @Column(name = "id", nullable = false)
    private var id: T,

    @Version var version: Long
) : Persistable<T> {

    override fun getId(): T {
        return id
    }

    override fun isNew(): Boolean {
        return version == null
    }

    override fun toString(): String {
        return "BaseIdEntity(id=$id, version=$version, isNew=$isNew)"
    }

    override fun equals(other: Any?): Boolean {
        if (this === other) return true
        if (javaClass != other?.javaClass) return false
        other as BaseEntity<*>
        if (id != other.id) return false
        return true
    }

    override fun hashCode(): Int {
        return id?.hashCode() ?: 0
    }

}
