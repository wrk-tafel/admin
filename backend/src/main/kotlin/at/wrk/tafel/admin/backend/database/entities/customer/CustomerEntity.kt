package at.wrk.tafel.admin.backend.database.entities.customer

import at.wrk.tafel.admin.backend.common.ExcludeFromTestCoverage
import at.wrk.tafel.admin.backend.database.entities.auth.UserEntity
import at.wrk.tafel.admin.backend.database.entities.base.BaseChangeTrackingEntity
import at.wrk.tafel.admin.backend.database.entities.base.Gender
import at.wrk.tafel.admin.backend.database.entities.staticdata.CountryEntity
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
    @JoinColumn(name = "user_id")
    var issuer: UserEntity? = null

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

    @OneToMany(mappedBy = "customer", cascade = [CascadeType.ALL], orphanRemoval = true)
    var additionalPersons: MutableList<CustomerAddPersonEntity> = mutableListOf()

    interface Specs {
        companion object {
            fun firstnameContains(firstname: String?): Specification<CustomerEntity>? {
                return firstname?.let {
                    Specification { root: Root<CustomerEntity>, _: CriteriaQuery<*>, cb: CriteriaBuilder ->
                        cb.like(
                            cb.lower(root.get("firstname")),
                            "%${firstname.lowercase()}%"
                        )
                    }
                }
            }

            fun lastnameContains(lastname: String?): Specification<CustomerEntity>? {
                return lastname?.let {
                    Specification { root: Root<CustomerEntity>, _: CriteriaQuery<*>, cb: CriteriaBuilder ->
                        cb.like(
                            cb.lower(root.get("lastname")),
                            "%${lastname.lowercase()}%"
                        )
                    }
                }
            }

            fun postProcessingNecessary(): Specification<CustomerEntity> {
                return Specification { root: Root<CustomerEntity>, cq: CriteriaQuery<*>, cb: CriteriaBuilder ->

                    val subQuery: Subquery<Long> = cq.subquery(Long::class.java)
                    val subRoot: Root<CustomerAddPersonEntity> = subQuery.from(CustomerAddPersonEntity::class.java)
                    val subScopes: Join<CustomerAddPersonEntity, CustomerEntity> = subRoot.join("customer")
                    subQuery.select(subScopes.get("id")).distinct(true)
                        .where(
                            cb.or(
                                cb.isNull(subRoot.get<LocalDate>("birthDate")),
                                cb.isNull(subRoot.get<Gender>("gender"))
                            )
                        )

                    cb.or(
                        cb.isNull(root.get<String>("lastname")),
                        cb.isNull(root.get<String>("firstname")),
                        cb.isNull(root.get<LocalDate>("birthDate")),
                        cb.isNull(root.get<LocalDate>("gender")),
                        cb.isNull(root.get<CountryEntity>("country")),
                        cb.isNull(root.get<String>("addressStreet")),
                        cb.isNull(root.get<String>("addressHouseNumber")),
                        cb.isNull(root.get<String>("addressPostalCode")),
                        cb.isNull(root.get<String>("addressCity")),
                        cb.isNull(root.get<String>("employer")),
                        root.get<Long>("id").`in`(subQuery)
                    )
                }
            }

            fun orderByUpdatedAtDesc(spec: Specification<CustomerEntity>): Specification<CustomerEntity> {
                return Specification { root: Root<CustomerEntity>, cq: CriteriaQuery<*>, cb: CriteriaBuilder ->
                    cq.orderBy(cb.desc(root.get<LocalDateTime>("updatedAt")))
                    spec.toPredicate(root, cq, cb)
                }
            }
        }
    }

}
