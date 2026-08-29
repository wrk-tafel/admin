package at.wrk.tafel.admin.backend.database.model.auth

import at.wrk.tafel.admin.backend.common.ExcludeFromTestCoverage
import at.wrk.tafel.admin.backend.database.model.base.BaseChangeTrackingEntity
import jakarta.persistence.Column
import jakarta.persistence.Entity
import jakarta.persistence.Table
import jakarta.persistence.criteria.CriteriaBuilder
import jakarta.persistence.criteria.CriteriaQuery
import jakarta.persistence.criteria.Expression
import jakarta.persistence.criteria.Root
import org.springframework.data.jpa.domain.Specification
import java.time.LocalDateTime

@Entity(name = "LoginAttempt")
@Table(name = "login_attempts")
@ExcludeFromTestCoverage
class LoginAttemptEntity(
    @Column(name = "username")
    var username: String,
    @Column(name = "last_failure_at")
    var lastFailureAt: LocalDateTime,
    @Column(name = "failure_count")
    var failureCount: Int = 0,
) : BaseChangeTrackingEntity() {

    @Column(name = "locked_until")
    var lockedUntil: LocalDateTime? = null

    interface Specs {
        companion object {
            fun usernameLike(usernamePattern: String): Specification<LoginAttemptEntity> = Specification { root: Root<LoginAttemptEntity>, _: CriteriaQuery<*>?, cb: CriteriaBuilder ->
                cb.like(cb.lower(root["username"]), usernamePattern.lowercase())
            }

            fun lockedOnly(now: LocalDateTime): Specification<LoginAttemptEntity> = Specification { root: Root<LoginAttemptEntity>, _: CriteriaQuery<*>?, cb: CriteriaBuilder ->
                val lockedUntil: Expression<LocalDateTime> = root["lockedUntil"]
                cb.and(cb.isNotNull(lockedUntil), cb.greaterThan(lockedUntil, now))
            }

            /**
             * Currently-locked entries first, most recent failure next, otherwise the admin screen's
             * whole reason for existing (somebody locked out right now) would be buried on a busy day.
             *
             * A [sortBy]/[sortDirection] pair - a user clicking a sortable `mat-sort-header` column on
             * the login-attempts screen - overrides this entirely, the same way
             * `UserEntity.Specs.orderBySearchRelevance` does: it is what the user explicitly asked for,
             * so the locked-first default no longer applies once a column is picked. [sortBy] takes the
             * same column ids the frontend's `mat-sort-header`s use (`username`, `failureCount`,
             * `lastFailureAt`, `lockedUntil`); an unrecognized or missing value falls back to the
             * locked-first default. `id` still closes out the order so paging stays stable when two
             * rows tie on the requested column.
             */
            fun orderByLockedFirst(
                spec: Specification<LoginAttemptEntity>,
                now: LocalDateTime,
                sortBy: String? = null,
                sortDirection: String? = null,
            ): Specification<LoginAttemptEntity> = Specification { root: Root<LoginAttemptEntity>, cq: CriteriaQuery<*>?, cb: CriteriaBuilder ->
                val id: Expression<Long> = root["id"]
                val username: Expression<String> = root["username"]
                val failureCount: Expression<Int> = root["failureCount"]
                val lastFailureAt: Expression<LocalDateTime> = root["lastFailureAt"]
                val lockedUntil: Expression<LocalDateTime> = root["lockedUntil"]
                val ascending = "asc".equals(sortDirection, ignoreCase = true)

                fun <T> CriteriaBuilder.orderBy(expression: Expression<T>) = if (ascending) asc(expression) else desc(expression)

                val orders = buildList {
                    when (sortBy) {
                        "username" -> add(cb.orderBy(username))
                        "failureCount" -> add(cb.orderBy(failureCount))
                        "lastFailureAt" -> add(cb.orderBy(lastFailureAt))
                        "lockedUntil" -> add(cb.orderBy(lockedUntil))
                        else -> {
                            val lockedRank = cb.selectCase<Int>()
                                .`when`(cb.and(cb.isNotNull(lockedUntil), cb.greaterThan(lockedUntil, now)), 0)
                                .otherwise(1)
                            add(cb.asc(lockedRank))
                            add(cb.desc(lastFailureAt))
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
