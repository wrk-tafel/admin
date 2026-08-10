package at.wrk.tafel.admin.backend.database.model.auth

import org.springframework.data.jpa.repository.JpaRepository
import org.springframework.data.jpa.repository.JpaSpecificationExecutor
import org.springframework.data.jpa.repository.Query
import org.springframework.data.repository.query.Param

interface UserRepository :
    JpaRepository<UserEntity, Long>,
    JpaSpecificationExecutor<UserEntity> {

    fun findByUsername(username: String): UserEntity?

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
}
