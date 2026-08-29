package at.wrk.tafel.admin.backend.database.model.auth

import at.wrk.tafel.admin.backend.TafelBaseIntegrationTest
import at.wrk.tafel.admin.backend.common.test.TestdataGenerator.createCountry
import at.wrk.tafel.admin.backend.common.test.TestdataGenerator.createHousehold
import at.wrk.tafel.admin.backend.common.test.TestdataGenerator.createUser
import at.wrk.tafel.admin.backend.common.test.TestdataGenerator.generateRandomLong
import at.wrk.tafel.admin.backend.database.common.search.SearchTextSpecs
import at.wrk.tafel.admin.backend.database.model.base.EmployeeEntity
import at.wrk.tafel.admin.backend.database.model.household.HouseholdEntity
import org.assertj.core.api.Assertions.assertThat
import org.junit.jupiter.api.Test
import org.springframework.beans.factory.annotation.Autowired
import org.springframework.boot.jpa.test.autoconfigure.TestEntityManager
import org.springframework.boot.jpa.test.autoconfigure.find
import org.springframework.transaction.annotation.Transactional

@Transactional
class UserEntitySpecsIT : TafelBaseIntegrationTest() {

    companion object {
        private const val SIMILARITY_THRESHOLD = 0.5f
    }

    @Autowired
    private lateinit var testEntityManager: TestEntityManager

    @Autowired
    private lateinit var userRepository: UserRepository

    @Test
    fun `searchTextMatches returns null spec when the search term is null`() {
        assertThat(UserEntity.Specs.searchTextMatches(null, SIMILARITY_THRESHOLD)).isNull()
    }

    @Test
    fun `searchTextMatches matches the username case insensitively`() {
        val tag = "Findme${generateRandomLong()}"
        val matching = persistUser { username = "prefix-$tag-suffix" }
        val notMatching = persistUser()
        testEntityManager.flush()

        val result = userRepository.findAll(searchSpec(tag.uppercase()))

        assertThat(result.map { it.id }).contains(matching.id).doesNotContain(notMatching.id)
    }

    @Test
    fun `searchTextMatches matches the employee's name and personnel number`() {
        val tag = "Findme${generateRandomLong()}"
        val byFirstname = persistUser { employee.firstname = "prefix-$tag-suffix" }
        val byLastname = persistUser { employee.lastname = "prefix-$tag-suffix" }
        val byPersonnelNumber = persistUser { employee.personnelNumber = tag }
        val notMatching = persistUser()
        testEntityManager.flush()

        val result = userRepository.findAll(searchSpec(tag))

        assertThat(result.map { it.id })
            .contains(byFirstname.id, byLastname.id, byPersonnelNumber.id)
            .doesNotContain(notMatching.id)
    }

    @Test
    fun `searchTextMatches still finds a user when the name is mistyped`() {
        val tag = 1_000_000_000_000L + generateRandomLong()
        val matching = persistUser { employee.lastname = "Findme$tag" }
        val notMatching = persistUser()
        testEntityManager.flush()

        // "findmr..." instead of "findme..." - close enough for trigrams, not a substring
        val result = userRepository.findAll(searchSpec("Findmr$tag"))

        assertThat(result.map { it.id }).contains(matching.id).doesNotContain(notMatching.id)
    }

    @Test
    fun `searchTextMatches follows a renamed employee`() {
        val tag = "Findme${generateRandomLong()}"
        val user = persistUser()
        testEntityManager.flush()

        user.employee.lastname = "prefix-$tag-suffix"
        testEntityManager.flush()

        val result = userRepository.findAll(searchSpec(tag))

        assertThat(result.map { it.id }).contains(user.id)
    }

    @Test
    fun `enabledEquals returns null spec when enabled is null`() {
        assertThat(UserEntity.Specs.enabledEquals(null)).isNull()
    }

    @Test
    fun `enabledEquals matches by enabled flag`() {
        val tag = "Findme${generateRandomLong()}"
        val enabledUser = persistUser {
            username = "prefix-$tag-enabled"
            enabled = true
        }
        val disabledUser = persistUser {
            username = "prefix-$tag-disabled"
            enabled = false
        }
        testEntityManager.flush()

        val result = userRepository.findAll(
            UserEntity.Specs.enabledEquals(true)!!.and(searchSpec(tag)),
        )

        assertThat(result.map { it.id }).contains(enabledUser.id).doesNotContain(disabledUser.id)
    }

    @Test
    fun `orderBySearchRelevance sorts the verbatim match before the merely similar one`() {
        val tag = 1_000_000_000_000L + generateRandomLong()
        val fuzzyHit = persistUser { employee.lastname = "Findmr$tag" }
        testEntityManager.flush()

        Thread.sleep(50)

        // persisted later, so it would come first on updatedAt alone
        val verbatimHit = persistUser { employee.lastname = "Findme$tag" }
        testEntityManager.flush()

        val searchTerm = SearchTextSpecs.normalize("Findme$tag")
        val spec = UserEntity.Specs.orderBySearchRelevance(searchTerm, searchSpec("Findme$tag"))
        val result = userRepository.findAll(spec)

        assertThat(result.map { it.id }).containsExactly(verbatimHit.id, fuzzyHit.id)
    }

    @Test
    fun `orderBySearchRelevance sorts the most recently updated user first without a search term`() {
        val tag = "Findme${generateRandomLong()}"
        val first = persistUser { username = "prefix-$tag-1" }
        testEntityManager.flush()

        Thread.sleep(50)

        val second = persistUser { username = "prefix-$tag-2" }
        testEntityManager.flush()

        val spec = UserEntity.Specs.orderBySearchRelevance(null, searchSpec(tag))
        val result = userRepository.findAll(spec)

        assertThat(result.map { it.id }).containsExactly(second.id, first.id)
    }

    @Test
    fun `orderBySearchRelevance sorts by the requested column, overriding the default order`() {
        val tag = "Findme${generateRandomLong()}"
        val bUser = persistUser {
            username = "prefix-$tag-1"
            employee.lastname = "Bravo-$tag"
        }
        testEntityManager.flush()

        Thread.sleep(50)

        // persisted later, so it would come first under the default (most-recently-updated) order
        val aUser = persistUser {
            username = "prefix-$tag-2"
            employee.lastname = "Alpha-$tag"
        }
        testEntityManager.flush()

        val spec = UserEntity.Specs.orderBySearchRelevance(null, searchSpec(tag), sortBy = "name", sortDirection = "asc")
        val result = userRepository.findAll(spec)

        assertThat(result.map { it.id }).containsExactly(aUser.id, bUser.id)
    }

    @Test
    fun `orderBySearchRelevance sorts descending when no direction or an unrecognized one is given`() {
        val tag = "Findme${generateRandomLong()}"
        val aUser = persistUser { employee.lastname = "Alpha-$tag" }
        val bUser = persistUser { employee.lastname = "Bravo-$tag" }
        testEntityManager.flush()

        val spec = UserEntity.Specs.orderBySearchRelevance(null, searchSpec(tag), sortBy = "name", sortDirection = null)
        val result = userRepository.findAll(spec)

        assertThat(result.map { it.id }).containsExactly(bUser.id, aUser.id)
    }

    @Test
    fun `orderBySearchRelevance sorts by id when requested`() {
        val tag = "Findme${generateRandomLong()}"
        val first = persistUser { username = "prefix-$tag-1" }
        val second = persistUser { username = "prefix-$tag-2" }
        testEntityManager.flush()

        val spec = UserEntity.Specs.orderBySearchRelevance(null, searchSpec(tag), sortBy = "id", sortDirection = "asc")
        val result = userRepository.findAll(spec)

        assertThat(result.map { it.id }).containsExactly(first.id, second.id)
    }

    @Test
    fun `orderBySearchRelevance sorts by status when requested`() {
        val tag = "Findme${generateRandomLong()}"
        val disabledUser = persistUser {
            username = "prefix-$tag-1"
            enabled = false
        }
        val enabledUser = persistUser {
            username = "prefix-$tag-2"
            enabled = true
        }
        testEntityManager.flush()

        val spec = UserEntity.Specs.orderBySearchRelevance(null, searchSpec(tag), sortBy = "status", sortDirection = "asc")
        val result = userRepository.findAll(spec)

        assertThat(result.map { it.id }).containsExactly(disabledUser.id, enabledUser.id)
    }

    @Test
    fun `orderBySearchRelevance sorts by personnelNumber when requested`() {
        val tag = "Findme${generateRandomLong()}"
        val lowerNumber = persistUser {
            username = "prefix-$tag-1"
            employee.personnelNumber = "1$tag"
        }
        val higherNumber = persistUser {
            username = "prefix-$tag-2"
            employee.personnelNumber = "2$tag"
        }
        testEntityManager.flush()

        val spec = UserEntity.Specs.orderBySearchRelevance(null, searchSpec(tag), sortBy = "personnelNumber", sortDirection = "asc")
        val result = userRepository.findAll(spec)

        assertThat(result.map { it.id }).containsExactly(lowerNumber.id, higherNumber.id)
    }

    @Test
    fun `deleting a user does not cascade-delete its shared employee`() {
        val user = persistUser()
        val country = createCountry()
        testEntityManager.persist(country)
        val household = createHousehold(user.employee!!, country)
        testEntityManager.persist(household)
        testEntityManager.flush()

        val employeeId = user.employee!!.id!!

        userRepository.delete(user)
        testEntityManager.flush()

        val survivingEmployee = testEntityManager.find<EmployeeEntity>(employeeId)
        assertThat(survivingEmployee).isNotNull()

        val survivingHousehold = testEntityManager.find<HouseholdEntity>(household.id!!)
        assertThat(survivingHousehold?.issuer?.id).isEqualTo(employeeId)
    }

    private fun searchSpec(searchInput: String) = UserEntity.Specs.searchTextMatches(
        SearchTextSpecs.normalize(searchInput),
        SIMILARITY_THRESHOLD,
    )!!

    /**
     * This query is what keeps the last administrator from being removed, so its exact semantics
     * matter more than most: it counts *other*, *enabled* holders, and counts each of them once.
     * Exercised against a real database because none of that is visible in a mocked repository - a
     * missing `distinct`, in particular, would inflate the count and quietly let the lockout it
     * exists to prevent go through.
     */
    @Test
    fun `countOtherEnabledUsersWithAuthority counts each enabled holder once, excluding the given user`() {
        val authority = "AUTH${generateRandomLong()}"
        val self = persistUserWithAuthorities(authority, "SOMETHING_ELSE")
        // Several authorities on one user: without `distinct` the join would count this user twice.
        persistUserWithAuthorities(authority, "SOMETHING_ELSE", "AND_ANOTHER")
        testEntityManager.flush()

        val result = userRepository.countOtherEnabledUsersWithAuthority(authority, self.id!!)

        assertThat(result).isEqualTo(1)
    }

    @Test
    fun `countOtherEnabledUsersWithAuthority ignores disabled holders`() {
        val authority = "AUTH${generateRandomLong()}"
        val self = persistUserWithAuthorities(authority)
        persistUserWithAuthorities(authority) { enabled = false }
        testEntityManager.flush()

        val result = userRepository.countOtherEnabledUsersWithAuthority(authority, self.id!!)

        assertThat(result).isZero()
    }

    @Test
    fun `countOtherEnabledUsersWithAuthority ignores users without the authority`() {
        val authority = "AUTH${generateRandomLong()}"
        val self = persistUserWithAuthorities(authority)
        persistUserWithAuthorities("A_DIFFERENT_ONE")
        testEntityManager.flush()

        val result = userRepository.countOtherEnabledUsersWithAuthority(authority, self.id!!)

        assertThat(result).isZero()
    }

    private fun persistUserWithAuthorities(
        vararg authorities: String,
        customize: UserEntity.() -> Unit = {},
    ): UserEntity = persistUser {
        enabled = true
        customize()
        this.authorities = authorities
            .map { UserAuthorityEntity(user = this, name = it) }
            .toMutableList()
    }

    private fun persistUser(customize: UserEntity.() -> Unit = {}): UserEntity {
        val user = createUser()
        user.customize()
        testEntityManager.persist(user)
        return user
    }
}
