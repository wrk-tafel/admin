package at.wrk.tafel.admin.backend.database.model.auth

import at.wrk.tafel.admin.backend.common.ExcludeFromTestCoverage
import at.wrk.tafel.admin.backend.database.common.search.SearchTextSpecs
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

    /**
     * Everything the single search box may match a user on - username plus the personnel number and
     * name of the linked employee - concatenated and lower-cased. Maintained by a database trigger
     * (see `R__00088_fulltext_search.sql`), hence read-only here.
     */
    @Column(name = "search_text", insertable = false, updatable = false)
    var searchText: String? = null

    interface Specs {
        companion object {
            fun searchTextMatches(searchTerm: String?, similarityThreshold: Float): Specification<UserEntity>? = searchTerm?.let {
                Specification { root: Root<UserEntity>, _: CriteriaQuery<*>?, cb: CriteriaBuilder ->
                    SearchTextSpecs.matches(cb, root[SearchTextSpecs.SEARCH_TEXT_ATTRIBUTE], searchTerm, similarityThreshold)
                }
            }

            fun enabledEquals(paramEnabled: Boolean?): Specification<UserEntity>? = paramEnabled?.let {
                Specification { root: Root<UserEntity>, _: CriteriaQuery<*>?, cb: CriteriaBuilder ->

                    val enabled: Expression<Boolean> = root["enabled"]
                    cb.equal(enabled, paramEnabled)
                }
            }

            /**
             * Best match first while a search term is given, most recently updated first otherwise
             * (a plain filter-only search has no notion of a better hit). Ordering always ends on the
             * id so paging stays stable when two users score - or were updated - identically.
             */
            fun orderBySearchRelevance(searchTerm: String?, spec: Specification<UserEntity>): Specification<UserEntity> = Specification { root: Root<UserEntity>, cq: CriteriaQuery<*>?, cb: CriteriaBuilder ->
                val updatedAt: Expression<LocalDateTime> = root["updatedAt"]
                val id: Expression<Long> = root["id"]

                val orders = buildList {
                    searchTerm?.let {
                        add(cb.desc(SearchTextSpecs.score(cb, root[SearchTextSpecs.SEARCH_TEXT_ATTRIBUTE], it)))
                    }
                    add(cb.desc(updatedAt))
                    add(cb.desc(id))
                }
                cq!!.orderBy(orders)
                spec.toPredicate(root, cq, cb)
            }
        }
    }
}
