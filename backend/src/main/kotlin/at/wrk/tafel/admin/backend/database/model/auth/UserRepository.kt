package at.wrk.tafel.admin.backend.database.model.auth

import org.springframework.data.domain.Pageable
import org.springframework.data.jpa.repository.JpaRepository
import org.springframework.data.jpa.repository.JpaSpecificationExecutor
import org.springframework.data.jpa.repository.Modifying
import org.springframework.data.jpa.repository.Query
import org.springframework.data.repository.query.Param
import java.time.LocalDateTime

interface UserRepository :
    JpaRepository<UserEntity, Long>,
    JpaSpecificationExecutor<UserEntity> {

    fun findByUsername(username: String): UserEntity?

    /**
     * Deliberately a bulk update rather than loading the entity and saving it back: every login
     * would otherwise bump `updated_at` (misplacing the account in the user search's "most recently
     * updated" ordering, see [UserEntity.Specs.orderBySearchRelevance]) and produce an audit_log
     * entry for a field nobody needs a history of - see [at.wrk.tafel.admin.backend.database.common.audit.AuditScope]
     * on why `login_attempts` is excluded for the same reason. A bulk `@Modifying` query never
     * reaches a Hibernate event, so it naturally sidesteps both.
     */
    @Modifying
    @Query("update User u set u.lastLogin = :lastLogin where u.username = :username")
    fun updateLastLogin(@Param("username") username: String, @Param("lastLogin") lastLogin: LocalDateTime)

    fun findByPersonnelNumber(personnelNumber: String): UserEntity?

    /**
     * Records [step] as the last accepted authenticator code, but only if it is later than the one
     * recorded before - and reports whether it was, which is what makes a code single-use even for
     * two requests racing with the same one. A bulk native update for the same reason as
     * [updateLastLogin]: no `updated_at` bump, no audit entry per login.
     */
    @Modifying
    @Query(
        value = "UPDATE users SET mfa_last_used_step = :step WHERE id = :id AND (mfa_last_used_step IS NULL OR mfa_last_used_step < :step)",
        nativeQuery = true,
    )
    fun advanceMfaStep(@Param("id") id: Long, @Param("step") step: Long): Int

    @Modifying
    @Query(value = "UPDATE users SET mfa_last_used_step = NULL WHERE id = :id", nativeQuery = true)
    fun clearMfaStep(@Param("id") id: Long): Int

    fun existsByUsername(username: String): Boolean

    /** What the dashboard's "Benutzer" tile shows while no distribution is active. */
    fun countByEnabledTrue(): Int

    /**
     * Counts the *enabled* users holding [authority], excluding [excludedUserId] - which is the
     * user about to be changed, so the answer is "would anyone else still hold it afterwards?".
     * Enabled-only because a disabled account cannot log in, and an authority nobody can exercise is
     * no safeguard at all.
     *
     * `distinct` because the join multiplies a user by their authorities; without it a user with
     * several permissions would be counted more than once and a lockout would slip through.
     */
    @Query(
        "select count(distinct u) from User u join u.authorities a " +
            "where a.name = :authority and u.enabled = true and u.id <> :excludedUserId",
    )
    fun countOtherEnabledUsersWithAuthority(
        @Param("authority") authority: String,
        @Param("excludedUserId") excludedUserId: Long,
    ): Long

    /**
     * The accounts behind [usernames] - one query for a whole page of login attempts rather than a
     * lookup per row. Compared lower-cased, since a login attempt records the username normalized
     * while an account keeps the spelling it was created with.
     */
    @Query("select lower(u.username) as username, u.id as userId from User u where lower(u.username) in :usernames")
    fun findIdsByUsernames(@Param("usernames") usernames: Collection<String>): List<UserIdProjection>

    /**
     * How many accounts `UserRetentionService` will delete once they have aged past [cutoff] - the
     * same measure as [findExpiredUserIdsSkipLocked] (the last login, or the creation date for an
     * account that never logged in; never an account holding [administratorAuthority]), but a plain
     * count without the row locks, since it only feeds the advance warning to administrators
     * (`RetentionExpiryReminderService`) and claims nothing.
     */
    @Query(
        value = """
            SELECT COUNT(*) FROM users u
            WHERE COALESCE(u.last_login, u.created_at) < :cutoff
              AND NOT EXISTS (
                  SELECT 1 FROM users_authorities ua
                  WHERE ua.user_id = u.id AND ua.name = :administratorAuthority
              )
        """,
        nativeQuery = true,
    )
    fun countUsersLastActiveBefore(
        @Param("cutoff") cutoff: LocalDateTime,
        @Param("administratorAuthority") administratorAuthority: String,
    ): Long

    /**
     * The accounts behind [countUsersLastActiveBefore], oldest activity first - what the "Anstehende
     * Löschungen" screen lists (`PendingDeletionsService`). [pageable] caps the list, since the count
     * next to it says how many there really are.
     */
    @Query(
        "select u from User u where coalesce(u.lastLogin, u.createdAt) < :cutoff " +
            "and not exists (select 1 from UserAuthority a where a.user = u and a.name = :administratorAuthority) " +
            "order by coalesce(u.lastLogin, u.createdAt) asc, u.id asc",
    )
    fun findUsersLastActiveBefore(
        @Param("cutoff") cutoff: LocalDateTime,
        @Param("administratorAuthority") administratorAuthority: String,
        pageable: Pageable,
    ): List<UserEntity>

    /**
     * Candidate ids for `UserRetentionService` (GDPR gap G13) - every non-administrator account that
     * hasn't logged in since before [cutoff], locked for the caller's transaction so a second
     * instance's poll skips an account this one is already deleting rather than racing it (see
     * ADR-0047). An account that has never logged in at all (`last_login is null`) is measured from
     * `created_at` instead, so a fresh or long-unused account still ages out rather than being
     * permanently exempt. An account holding [administratorAuthority] is never a candidate, full stop
     * - not just while it's the last one, the way `UserController`'s manual safeguards work; that
     * permission is deliberately kept out of an automatic job's reach entirely. Native and set-based
     * because `FOR UPDATE SKIP LOCKED` has no derived-query equivalent. Only the candidate ids, not
     * the deletion itself - that goes through `TafelUserDetailsManager.deleteUser` for its cascades.
     */
    @Query(
        value = """
            SELECT u.id FROM users u
            WHERE (
                (u.last_login IS NOT NULL AND u.last_login < :cutoff)
                OR (u.last_login IS NULL AND u.created_at < :cutoff)
            )
              AND NOT EXISTS (
                  SELECT 1 FROM users_authorities ua
                  WHERE ua.user_id = u.id AND ua.name = :administratorAuthority
              )
            FOR UPDATE SKIP LOCKED
        """,
        nativeQuery = true,
    )
    fun findExpiredUserIdsSkipLocked(
        @Param("cutoff") cutoff: LocalDateTime,
        @Param("administratorAuthority") administratorAuthority: String,
    ): List<Long>
}

/** One account id and the lower-cased username it belongs to, as [UserRepository.findIdsByUsernames] reads them. */
interface UserIdProjection {
    val username: String
    val userId: Long
}
