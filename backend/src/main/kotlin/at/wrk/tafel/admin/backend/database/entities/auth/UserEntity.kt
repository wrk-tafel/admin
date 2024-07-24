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
import jakarta.persistence.criteria.Expression
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
                    Specification { root: Root<UserEntity>, _: CriteriaQuery<*>?, cb: CriteriaBuilder ->
                        cb.like(
                            cb.lower(root["username"]),
                            "%${username.lowercase()}%"
                        )
                    }
                }
            }

            fun firstnameContains(firstname: String?): Specification<UserEntity>? {
                return firstname?.let {
                    Specification { root: Root<UserEntity>, _: CriteriaQuery<*>?, cb: CriteriaBuilder ->
                        cb.like(
                            cb.lower(root["firstname"]),
                            "%${firstname.lowercase()}%"
                        )
                    }
                }
            }

            fun lastnameContains(lastname: String?): Specification<UserEntity>? {
                return lastname?.let {
                    Specification { root: Root<UserEntity>, _: CriteriaQuery<*>?, cb: CriteriaBuilder ->
                        cb.like(
                            cb.lower(root["lastname"]),
                            "%${lastname.lowercase()}%"
                        )
                    }
                }
            }

            fun enabledEquals(paramEnabled: Boolean?): Specification<UserEntity>? {
                return paramEnabled?.let {
                    Specification { root: Root<UserEntity>, _: CriteriaQuery<*>?, cb: CriteriaBuilder ->

                        val enabled: Expression<Boolean> = root["enabled"]
                        cb.equal(enabled, paramEnabled)

                    }
                }
            }

            fun orderByUpdatedAtDesc(spec: Specification<UserEntity>): Specification<UserEntity> {
                return Specification { root: Root<UserEntity>, cq: CriteriaQuery<*>?, cb: CriteriaBuilder ->

                    val updatedAt: Expression<LocalDateTime> = root["updatedAt"]
                    cq!!.orderBy(cb.desc(updatedAt))
                    spec.toPredicate(root, cq, cb)

                }
            }

        }
    }

}
