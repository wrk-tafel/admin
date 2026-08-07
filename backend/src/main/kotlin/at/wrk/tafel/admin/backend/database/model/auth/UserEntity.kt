package at.wrk.tafel.admin.backend.database.model.auth

import at.wrk.tafel.admin.backend.common.ExcludeFromTestCoverage
import at.wrk.tafel.admin.backend.database.model.base.BaseChangeTrackingEntity
import at.wrk.tafel.admin.backend.database.model.base.EmployeeEntity
import jakarta.persistence.CascadeType
import jakarta.persistence.Column
import jakarta.persistence.Entity
import jakarta.persistence.FetchType
import jakarta.persistence.JoinColumn
import jakarta.persistence.OneToMany
import jakarta.persistence.OneToOne
import jakarta.persistence.Table
import jakarta.persistence.criteria.CriteriaBuilder
import jakarta.persistence.criteria.CriteriaQuery
import jakarta.persistence.criteria.Expression
import jakarta.persistence.criteria.Join
import jakarta.persistence.criteria.Root
import org.springframework.data.jpa.domain.Specification
import java.time.LocalDateTime

@Entity(name = "User")
@Table(name = "users")
@ExcludeFromTestCoverage
class UserEntity(
    @Column(name = "username")
    var username: String,
    @Column(name = "password")
    var password: String,
    // Employee rows are shared/independent (see EmployeeController) and can be referenced
    // elsewhere (household issuer, household notes, food collection driver/co-driver) via plain,
    // non-cascading FKs. PERSIST+MERGE keeps saving a user auto-saving its linked employee, but
    // without REMOVE, deleting a user no longer cascades into deleting that shared employee record.
    @OneToOne(cascade = [CascadeType.PERSIST, CascadeType.MERGE])
    @JoinColumn(name = "employee_id", referencedColumnName = "id", nullable = false)
    var employee: EmployeeEntity,
    @Column(name = "enabled")
    var enabled: Boolean = false,
    @Column(name = "passwordchange_required")
    var passwordChangeRequired: Boolean = false,
) : BaseChangeTrackingEntity() {

    @OneToMany(mappedBy = "user", cascade = [CascadeType.ALL], orphanRemoval = true, fetch = FetchType.EAGER)
    var authorities: MutableList<UserAuthorityEntity> = mutableListOf()

    interface Specs {
        companion object {
            fun usernameContains(username: String?): Specification<UserEntity>? = username?.let {
                Specification { root: Root<UserEntity>, _: CriteriaQuery<*>?, cb: CriteriaBuilder ->
                    cb.like(
                        cb.lower(root["username"]),
                        "%${username.lowercase()}%",
                    )
                }
            }

            fun firstnameContains(firstname: String?): Specification<UserEntity>? = firstname?.let {
                Specification { root: Root<UserEntity>, _: CriteriaQuery<*>?, cb: CriteriaBuilder ->
                    val employee: Join<UserEntity, EmployeeEntity> = root.join("employee")
                    cb.like(
                        cb.lower(employee["firstname"]),
                        "%${firstname.lowercase()}%",
                    )
                }
            }

            fun lastnameContains(lastname: String?): Specification<UserEntity>? = lastname?.let {
                Specification { root: Root<UserEntity>, _: CriteriaQuery<*>?, cb: CriteriaBuilder ->
                    val employee: Join<UserEntity, EmployeeEntity> = root.join("employee")
                    cb.like(
                        cb.lower(employee["lastname"]),
                        "%${lastname.lowercase()}%",
                    )
                }
            }

            fun enabledEquals(paramEnabled: Boolean?): Specification<UserEntity>? = paramEnabled?.let {
                Specification { root: Root<UserEntity>, _: CriteriaQuery<*>?, cb: CriteriaBuilder ->

                    val enabled: Expression<Boolean> = root["enabled"]
                    cb.equal(enabled, paramEnabled)
                }
            }

            fun orderByUpdatedAtDesc(spec: Specification<UserEntity>): Specification<UserEntity> = Specification { root: Root<UserEntity>, cq: CriteriaQuery<*>?, cb: CriteriaBuilder ->

                val updatedAt: Expression<LocalDateTime> = root["updatedAt"]
                val id: Expression<Long> = root["id"]
                cq!!.orderBy(cb.desc(updatedAt), cb.desc(id))
                spec.toPredicate(root, cq, cb)
            }
        }
    }
}
