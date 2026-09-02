package at.wrk.tafel.admin.backend.database.model.auth

import at.wrk.tafel.admin.backend.TafelBaseIntegrationTest
import at.wrk.tafel.admin.backend.common.test.TestdataGenerator.generateRandomLong
import org.assertj.core.api.Assertions.assertThat
import org.junit.jupiter.api.Test
import org.springframework.beans.factory.annotation.Autowired
import org.springframework.boot.jpa.test.autoconfigure.TestEntityManager
import org.springframework.data.jpa.domain.Specification.where
import org.springframework.transaction.annotation.Transactional
import java.time.LocalDateTime

@Transactional
class LoginAttemptEntitySpecsIT : TafelBaseIntegrationTest() {

    @Autowired
    private lateinit var testEntityManager: TestEntityManager

    @Autowired
    private lateinit var loginAttemptRepository: LoginAttemptRepository

    private val now = LocalDateTime.of(2024, 1, 1, 10, 0)

    @Test
    fun `usernameLike matches case-insensitively`() {
        val tag = "findme${generateRandomLong()}"
        val matching = persist(username = "prefix-$tag-suffix")
        val notMatching = persist(username = "other-${generateRandomLong()}")
        testEntityManager.flush()

        val result = loginAttemptRepository.findAll(LoginAttemptEntity.Specs.usernameLike(tag.uppercase()))

        assertThat(result.map { it.id }).contains(matching.id).doesNotContain(notMatching.id)
    }

    @Test
    fun `usernameLike escapes LIKE wildcards, so an underscore in the search term is matched literally`() {
        val tag = generateRandomLong()
        val matching = persist(username = "a_b-$tag")
        val wildcardVictim = persist(username = "axb-$tag")
        testEntityManager.flush()

        val result = loginAttemptRepository.findAll(LoginAttemptEntity.Specs.usernameLike("a_b-$tag"))

        assertThat(result.map { it.id }).contains(matching.id).doesNotContain(wildcardVictim.id)
    }

    @Test
    fun `usernameLike escapes LIKE wildcards, so a lone percent sign does not match every row`() {
        persist(username = "unrelated-${generateRandomLong()}")
        val matching = persist(username = "has-a-%-sign-${generateRandomLong()}")
        testEntityManager.flush()

        val result = loginAttemptRepository.findAll(LoginAttemptEntity.Specs.usernameLike("%"))

        assertThat(result.map { it.id }).containsExactly(matching.id)
    }

    @Test
    fun `lockedOnly matches only entries locked in the future`() {
        val locked = persist(username = "locked-${generateRandomLong()}", lockedUntil = now.plusMinutes(5))
        val expired = persist(username = "expired-${generateRandomLong()}", lockedUntil = now.minusMinutes(5))
        val notLocked = persist(username = "notlocked-${generateRandomLong()}")
        testEntityManager.flush()

        val result = loginAttemptRepository.findAll(LoginAttemptEntity.Specs.lockedOnly(now))

        assertThat(result.map { it.id }).contains(locked.id).doesNotContain(expired.id, notLocked.id)
    }

    @Test
    fun `orderByLockedFirst sorts a currently locked entry before an unlocked one, by default`() {
        val tag = generateRandomLong()
        val unlocked = persist(username = "unlocked-$tag", lastFailureAt = now.minusMinutes(1))
        val locked = persist(username = "locked-$tag", lastFailureAt = now.minusMinutes(10), lockedUntil = now.plusMinutes(5))
        testEntityManager.flush()

        val spec = LoginAttemptEntity.Specs.orderByLockedFirst(where(LoginAttemptEntity.Specs.usernameLike("$tag")), now)
        val result = loginAttemptRepository.findAll(spec)

        assertThat(result.map { it.id }).containsExactly(locked.id, unlocked.id)
    }

    @Test
    fun `orderByLockedFirst sorts by most recent failure first among unlocked entries, by default`() {
        val tag = generateRandomLong()
        val older = persist(username = "older-$tag", lastFailureAt = now.minusMinutes(10))
        val newer = persist(username = "newer-$tag", lastFailureAt = now.minusMinutes(1))
        testEntityManager.flush()

        val spec = LoginAttemptEntity.Specs.orderByLockedFirst(where(LoginAttemptEntity.Specs.usernameLike("$tag")), now)
        val result = loginAttemptRepository.findAll(spec)

        assertThat(result.map { it.id }).containsExactly(newer.id, older.id)
    }

    @Test
    fun `orderByLockedFirst sorts by the requested column, overriding the locked-first default`() {
        val tag = generateRandomLong()
        // Would come first under the locked-first default - the sortBy override should ignore that.
        val locked = persist(username = "b-locked-$tag", lockedUntil = now.plusMinutes(5))
        val unlocked = persist(username = "a-unlocked-$tag")
        testEntityManager.flush()

        val spec = LoginAttemptEntity.Specs.orderByLockedFirst(
            where(LoginAttemptEntity.Specs.usernameLike("$tag")),
            now,
            sortBy = "username",
            sortDirection = "asc",
        )
        val result = loginAttemptRepository.findAll(spec)

        assertThat(result.map { it.id }).containsExactly(unlocked.id, locked.id)
    }

    @Test
    fun `orderByLockedFirst sorts descending when no direction or an unrecognized one is given`() {
        val tag = generateRandomLong()
        val a = persist(username = "a-$tag")
        val b = persist(username = "b-$tag")
        testEntityManager.flush()

        val spec = LoginAttemptEntity.Specs.orderByLockedFirst(
            where(LoginAttemptEntity.Specs.usernameLike("$tag")),
            now,
            sortBy = "username",
            sortDirection = null,
        )
        val result = loginAttemptRepository.findAll(spec)

        assertThat(result.map { it.id }).containsExactly(b.id, a.id)
    }

    @Test
    fun `orderByLockedFirst sorts by failureCount when requested`() {
        val tag = generateRandomLong()
        val fewer = persist(username = "fewer-$tag", failureCount = 1)
        val more = persist(username = "more-$tag", failureCount = 5)
        testEntityManager.flush()

        val spec = LoginAttemptEntity.Specs.orderByLockedFirst(
            where(LoginAttemptEntity.Specs.usernameLike("$tag")),
            now,
            sortBy = "failureCount",
            sortDirection = "asc",
        )
        val result = loginAttemptRepository.findAll(spec)

        assertThat(result.map { it.id }).containsExactly(fewer.id, more.id)
    }

    private fun persist(
        username: String,
        lastFailureAt: LocalDateTime = now,
        failureCount: Int = 1,
        lockedUntil: LocalDateTime? = null,
    ): LoginAttemptEntity {
        val entity = LoginAttemptEntity(username = username, lastFailureAt = lastFailureAt, failureCount = failureCount)
        entity.lockedUntil = lockedUntil
        testEntityManager.persist(entity)
        return entity
    }
}
