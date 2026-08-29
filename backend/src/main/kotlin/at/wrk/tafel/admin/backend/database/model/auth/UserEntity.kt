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
import jakarta.persistence.criteria.JoinType
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
     * The most recent successful login, `null` for an account that has never logged in. Written by
     * [at.wrk.tafel.admin.backend.database.model.auth.UserRepository.updateLastLogin] on every login
     * rather than through a loaded/saved entity - see that method for why.
     */
    @Column(name = "last_login")
    var lastLogin: LocalDateTime? = null

    /**
     * `null` until the first time this user's password is changed or they log out - from then on,
     * [at.wrk.tafel.admin.backend.common.auth.components.TafelJwtAuthProvider] rejects any JWT whose
     * `issuedAt` claim is not strictly after this. Neither event can invalidate just the one token
     * being replaced (a JWT carries no session id), so this invalidates every currently-issued token
     * for the user at once rather than leaving old ones live for the rest of their expiration.
     */
    @Column(name = "token_invalidated_at")
    var tokenInvalidatedAt: LocalDateTime? = null

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
             *
             * A [sortBy]/[sortDirection] pair - a user clicking a sortable `mat-sort-header` column on
             * the user search screen - overrides all of that: it is what the user explicitly asked
             * for, so it takes over as the primary order instead of merely breaking ties within it.
             * [sortBy] takes the same column ids the frontend's `mat-sort-header`s use (`id`, `name`,
             * `personnelNumber`, `status`); an unrecognized or missing value falls back to the
             * relevance/updatedAt default. `id` still closes out the order so paging stays stable when
             * two users tie on the requested column.
             */
            fun orderBySearchRelevance(
                searchTerm: String?,
                spec: Specification<UserEntity>,
                sortBy: String? = null,
                sortDirection: String? = null,
            ): Specification<UserEntity> = Specification { root: Root<UserEntity>, cq: CriteriaQuery<*>?, cb: CriteriaBuilder ->
                val updatedAt: Expression<LocalDateTime> = root["updatedAt"]
                val id: Expression<Long> = root["id"]
                val ascending = "asc".equals(sortDirection, ignoreCase = true)

                fun <T> CriteriaBuilder.orderBy(expression: Expression<T>) = if (ascending) asc(expression) else desc(expression)

                val orders = buildList {
                    when (sortBy) {
                        "id" -> add(cb.orderBy(id))
                        "status" -> {
                            val enabled: Expression<Boolean> = root["enabled"]
                            add(cb.orderBy(enabled))
                        }
                        "personnelNumber" -> {
                            val employee = root.join<UserEntity, EmployeeEntity>("employee", JoinType.LEFT)
                            val personnelNumber: Expression<String> = employee["personnelNumber"]
                            add(cb.orderBy(personnelNumber))
                        }
                        "name" -> {
                            val employee = root.join<UserEntity, EmployeeEntity>("employee", JoinType.LEFT)
                            val lastname: Expression<String> = employee["lastname"]
                            val firstname: Expression<String> = employee["firstname"]
                            add(cb.orderBy(lastname))
                            add(cb.orderBy(firstname))
                        }
                        else -> {
                            searchTerm?.let {
                                add(cb.desc(SearchTextSpecs.score(cb, root[SearchTextSpecs.SEARCH_TEXT_ATTRIBUTE], it)))
                            }
                            add(cb.desc(updatedAt))
                        }
                    }
                    add(cb.desc(id))
                }
                cq!!.orderBy(orders)
                spec.toPredicate(root, cq, cb)
            }
        }
    }
}
