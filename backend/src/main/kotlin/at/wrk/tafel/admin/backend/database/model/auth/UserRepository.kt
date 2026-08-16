package at.wrk.tafel.admin.backend.database.model.auth

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

    fun findByEmployeePersonnelNumber(personnelNumber: String): UserEntity?

    fun existsByUsername(username: String): Boolean

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
     * The accounts linked to [employeeIds] - one query for a whole page of employees rather than a
     * lookup per row. A projection rather than the entities, because the only thing read of an
     * account here is which employee it belongs to and how to address it.
     */
    @Query(
        "select u.employee.id as employeeId, u.id as userId, u.username as username " +
            "from User u where u.employee.id in :employeeIds",
    )
    fun findAccountsByEmployeeIds(@Param("employeeIds") employeeIds: Collection<Long>): List<EmployeeUserAccountProjection>

    /**
     * The accounts behind [usernames] - one query for a whole page of login attempts rather than a
     * lookup per row. Compared lower-cased, since a login attempt records the username normalized
     * while an account keeps the spelling it was created with.
     */
    @Query("select lower(u.username) as username, u.id as userId from User u where lower(u.username) in :usernames")
    fun findIdsByUsernames(@Param("usernames") usernames: Collection<String>): List<UserIdProjection>
}

/** One account id and the lower-cased username it belongs to, as [UserRepository.findIdsByUsernames] reads them. */
interface UserIdProjection {
    val username: String
    val userId: Long
}

/** One user account, as [UserRepository.findAccountsByEmployeeIds] reads them. */
interface EmployeeUserAccountProjection {
    val employeeId: Long
    val userId: Long
    val username: String
}
