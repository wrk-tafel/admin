package at.wrk.tafel.admin.backend.database.entities.auth

import at.wrk.tafel.admin.backend.common.ExcludeFromTestCoverage
import at.wrk.tafel.admin.backend.database.entities.base.BaseChangeTrackingEntity
import jakarta.persistence.CascadeType
import jakarta.persistence.Column
import jakarta.persistence.Entity
import jakarta.persistence.FetchType
import jakarta.persistence.OneToMany
import jakarta.persistence.Table
import jakarta.persistence.criteria.CriteriaBuilder
import jakarta.persistence.criteria.CriteriaQuery
import jakarta.persistence.criteria.Root
import org.springframework.data.jpa.domain.Specification
import java.time.LocalDateTime

@Entity(name = "User")
@Table(name = "users")
@ExcludeFromTestCoverage
class UserEntity : BaseChangeTrackingEntity() {
    @Column(name = "username")
    var username: String? = null

    @Column(name = "password")
    var password: String? = null

    @Column(name = "enabled")
    var enabled: Boolean? = false

    @Column(name = "personnel_number")
    var personnelNumber: String? = null

    @Column(name = "firstname")
    var firstname: String? = null

    @Column(name = "lastname")
    var lastname: String? = null

    @Column(name = "passwordchange_required")
    var passwordChangeRequired: Boolean? = null

    @OneToMany(mappedBy = "user", cascade = [CascadeType.ALL], orphanRemoval = true, fetch = FetchType.EAGER)
    var authorities: MutableList<UserAuthorityEntity> = mutableListOf()

    interface Specs {
        companion object {
            fun usernameContains(username: String?): Specification<UserEntity>? {
                return username?.let {
                    Specification { root: Root<UserEntity>, cq: CriteriaQuery<*>, cb: CriteriaBuilder ->
                        cb.like(
                            cb.lower(root.get("username")),
                            "%${username.lowercase()}%"
                        )
                    }
                }
            }

            fun firstnameContains(firstname: String?): Specification<UserEntity>? {
                return firstname?.let {
                    Specification { root: Root<UserEntity>, cq: CriteriaQuery<*>, cb: CriteriaBuilder ->
                        cb.like(
                            cb.lower(root.get("firstname")),
                            "%${firstname.lowercase()}%"
                        )
                    }
                }
            }

            fun lastnameContains(lastname: String?): Specification<UserEntity>? {
                return lastname?.let {
                    Specification { root: Root<UserEntity>, cq: CriteriaQuery<*>, cb: CriteriaBuilder ->
                        cb.like(
                            cb.lower(root.get("lastname")),
                            "%${lastname.lowercase()}%"
                        )
                    }
                }
            }

            fun enabledEquals(enabled: Boolean?): Specification<UserEntity>? {
                return enabled?.let {
                    Specification { root: Root<UserEntity>, cq: CriteriaQuery<*>, cb: CriteriaBuilder ->
                        cb.equal(root.get<Boolean>("enabled"), enabled)
                    }
                }
            }

            fun orderByUpdatedAtDesc(spec: Specification<UserEntity>): Specification<UserEntity> {
                return Specification { root: Root<UserEntity>, cq: CriteriaQuery<*>, cb: CriteriaBuilder ->
                    cq.orderBy(cb.desc(root.get<LocalDateTime>("updatedAt")))
                    spec.toPredicate(root, cq, cb)
                }
            }

        }
    }

}
