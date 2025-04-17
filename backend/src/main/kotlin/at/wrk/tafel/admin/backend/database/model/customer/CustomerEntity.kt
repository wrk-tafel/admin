package at.wrk.tafel.admin.backend.database.model.customer

import at.wrk.tafel.admin.backend.common.ExcludeFromTestCoverage
import at.wrk.tafel.admin.backend.database.model.auth.UserEntity
import at.wrk.tafel.admin.backend.database.model.base.BaseChangeTrackingEntity
import at.wrk.tafel.admin.backend.database.model.base.EmployeeEntity
import at.wrk.tafel.admin.backend.database.model.base.Gender
import at.wrk.tafel.admin.backend.database.model.staticdata.CountryEntity
import jakarta.persistence.CascadeType
import jakarta.persistence.Column
import jakarta.persistence.Entity
import jakarta.persistence.EnumType
import jakarta.persistence.Enumerated
import jakarta.persistence.JoinColumn
import jakarta.persistence.ManyToOne
import jakarta.persistence.OneToMany
import jakarta.persistence.Table
import jakarta.persistence.criteria.CriteriaBuilder
import jakarta.persistence.criteria.CriteriaQuery
import jakarta.persistence.criteria.Expression
import jakarta.persistence.criteria.Join
import jakarta.persistence.criteria.Root
import jakarta.persistence.criteria.Subquery
import org.springframework.data.jpa.domain.Specification
import java.math.BigDecimal
import java.time.LocalDate
import java.time.LocalDateTime


@Entity(name = "Customer")
@Table(name = "customers")
@ExcludeFromTestCoverage
class CustomerEntity : BaseChangeTrackingEntity() {

    @Column(name = "customer_id")
    var customerId: Long? = null

    @ManyToOne
    @JoinColumn(name = "employee_id")
    var issuer: EmployeeEntity? = null

    @Column(name = "firstname")
    var firstname: String? = null

    @Column(name = "lastname")
    var lastname: String? = null

    @Column(name = "birth_date")
    var birthDate: LocalDate? = null

    @Column(name = "gender")
    @Enumerated(EnumType.STRING)
    var gender: Gender? = null

    @ManyToOne
    var country: CountryEntity? = null

    @Column(name = "address_street")
    var addressStreet: String? = null

    @Column(name = "address_housenumber")
    var addressHouseNumber: String? = null

    @Column(name = "address_stairway")
    var addressStairway: String? = null

    @Column(name = "address_postalcode")
    var addressPostalCode: Int? = null

    @Column(name = "address_door")
    var addressDoor: String? = null

    @Column(name = "address_city")
    var addressCity: String? = null

    @Column(name = "telephone_number")
    var telephoneNumber: String? = null

    @Column(name = "email")
    var email: String? = null

    @Column(name = "employer")
    var employer: String? = null

    @Column(name = "income")
    var income: BigDecimal? = null

    @Column(name = "incomeDue")
    var incomeDue: LocalDate? = null

    @Column(name = "valid_until")
    var validUntil: LocalDate? = null

    @Column(name = "locked")
    var locked: Boolean? = null

    @Column(name = "locked_at")
    var lockedAt: LocalDateTime? = null

    @Column(name = "prolonged_at")
    var prolongedAt: LocalDateTime? = null

    @ManyToOne
    @JoinColumn(name = "locked_by")
    var lockedBy: UserEntity? = null

    @Column(name = "lock_reason")
    var lockReason: String? = null

    @Column(name = "migrated")
    var migrated: Boolean? = null

    @Column(name = "pending_cost_contribution")
    var pendingCostContribution: BigDecimal = BigDecimal.ZERO

    @OneToMany(mappedBy = "customer", cascade = [CascadeType.ALL], orphanRemoval = true)
    var additionalPersons: MutableList<CustomerAddPersonEntity> = mutableListOf()

    interface Specs {
        companion object {
            fun firstnameContains(firstname: String?): Specification<CustomerEntity>? {
                return firstname?.let {
                    Specification { root: Root<CustomerEntity>, _: CriteriaQuery<*>?, cb: CriteriaBuilder ->
                        cb.like(
                            cb.lower(root["firstname"]),
                            "%${firstname.lowercase()}%"
                        )
                    }
                }
            }

            fun lastnameContains(lastname: String?): Specification<CustomerEntity>? {
                return lastname?.let {
                    Specification { root: Root<CustomerEntity>, _: CriteriaQuery<*>?, cb: CriteriaBuilder ->
                        cb.like(
                            cb.lower(root["lastname"]),
                            "%${lastname.lowercase()}%"
                        )
                    }
                }
            }

            fun postProcessingNecessary(): Specification<CustomerEntity> {
                return Specification { root: Root<CustomerEntity>, cq: CriteriaQuery<*>?, cb: CriteriaBuilder ->

                    val subQuery: Subquery<Long> = cq!!.subquery(Long::class.java)
                    val subRoot: Root<CustomerAddPersonEntity> = subQuery.from(CustomerAddPersonEntity::class.java)
                    val subScopes: Join<CustomerAddPersonEntity, CustomerEntity> = subRoot.join("customer")

                    val subBirthDate: Expression<LocalDate> = subRoot["birthDate"]
                    val subGender: Expression<Gender> = subRoot["gender"]

                    subQuery.select(subScopes["id"]).distinct(true)
                        .where(
                            cb.or(
                                cb.isNull(subBirthDate),
                                cb.isNull(subGender)
                            )
                        )

                    val lastname: Expression<String> = root["lastname"]
                    val firstname: Expression<String> = root["firstname"]
                    val birthDate: Expression<LocalDate> = root["birthDate"]
                    val gender: Expression<Gender> = root["gender"]
                    val country: Expression<CountryEntity> = root["country"]

                    val addressStreet: Expression<String> = root["addressStreet"]
                    val addressHouseNumber: Expression<String> = root["addressHouseNumber"]
                    val addressPostalCode: Expression<String> = root["addressPostalCode"]
                    val addressCity: Expression<String> = root["addressCity"]
                    val employer: Expression<String> = root["employer"]
                    val id: Expression<Long> = root["id"]

                    cb.or(
                        cb.isNull(lastname),
                        cb.isNull(firstname),
                        cb.isNull(birthDate),
                        cb.isNull(gender),
                        cb.isNull(country),
                        cb.isNull(addressStreet),
                        cb.isNull(addressHouseNumber),
                        cb.isNull(addressPostalCode),
                        cb.isNull(addressCity),
                        cb.isNull(employer),
                        id.`in`(subQuery)
                    )
                }
            }

            fun orderByUpdatedAtDesc(spec: Specification<CustomerEntity>): Specification<CustomerEntity> {
                return Specification { root: Root<CustomerEntity>, cq: CriteriaQuery<*>?, cb: CriteriaBuilder ->
                    val updatedAt: Expression<LocalDate> = root["updatedAt"]

                    cq!!.orderBy(cb.desc(updatedAt))
                    spec.toPredicate(root, cq, cb)
                }
            }
        }
    }

}
