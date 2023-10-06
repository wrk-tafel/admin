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

    @ExcludeFromTestCoverage
    interface Specs {
        companion object {
            fun usernameContains(username: String?): Specification<UserEntity>? {
                return username?.let {
                    Specification { customer: Root<UserEntity>, cq: CriteriaQuery<*>, cb: CriteriaBuilder ->
                        cb.like(
                            cb.lower(customer.get("username")),
                            "%${username.lowercase()}%"
                        )
                    }
                }
            }

            fun firstnameContains(firstname: String?): Specification<UserEntity>? {
                return firstname?.let {
                    Specification { user: Root<UserEntity>, cq: CriteriaQuery<*>, cb: CriteriaBuilder ->
                        cb.like(
                            cb.lower(user.get("firstname")),
                            "%${firstname.lowercase()}%"
                        )
                    }
                }
            }

            fun lastnameContains(lastname: String?): Specification<UserEntity>? {
                return lastname?.let {
                    Specification { user: Root<UserEntity>, cq: CriteriaQuery<*>, cb: CriteriaBuilder ->
                        cb.like(
                            cb.lower(user.get("lastname")),
                            "%${lastname.lowercase()}%"
                        )
                    }
                }
            }

            fun enabledEquals(enabled: Boolean?): Specification<UserEntity>? {
                return enabled?.let {
                    Specification { user: Root<UserEntity>, cq: CriteriaQuery<*>, cb: CriteriaBuilder ->
                        cb.equal(user.get<Boolean>("enabled"), enabled)
                    }
                }
            }
        }
    }

}
