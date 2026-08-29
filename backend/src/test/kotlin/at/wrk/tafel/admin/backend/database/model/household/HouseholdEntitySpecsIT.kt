package at.wrk.tafel.admin.backend.database.model.household

import at.wrk.tafel.admin.backend.TafelBaseIntegrationTest
import at.wrk.tafel.admin.backend.common.test.TestdataGenerator.createCountry
import at.wrk.tafel.admin.backend.common.test.TestdataGenerator.createHousehold
import at.wrk.tafel.admin.backend.common.test.TestdataGenerator.createUser
import at.wrk.tafel.admin.backend.common.test.TestdataGenerator.generateRandomLong
import at.wrk.tafel.admin.backend.database.common.search.SearchTextSpecs
import at.wrk.tafel.admin.backend.database.model.auth.UserEntity
import at.wrk.tafel.admin.backend.database.model.person.PersonEntity
import at.wrk.tafel.admin.backend.database.model.staticdata.CountryEntity
import org.assertj.core.api.Assertions.assertThat
import org.junit.jupiter.api.BeforeEach
import org.junit.jupiter.api.Test
import org.springframework.beans.factory.annotation.Autowired
import org.springframework.boot.jpa.test.autoconfigure.TestEntityManager
import org.springframework.transaction.annotation.Transactional
import java.math.BigDecimal
import java.time.LocalDate
import java.time.Period

@Transactional
class HouseholdEntitySpecsIT : TafelBaseIntegrationTest() {

    companion object {
        private const val SIMILARITY_THRESHOLD = 0.5f
    }

    @Autowired
    private lateinit var testEntityManager: TestEntityManager

    @Autowired
    private lateinit var householdRepository: HouseholdRepository

    private lateinit var testUser: UserEntity
    private lateinit var testCountry: CountryEntity

    @BeforeEach
    fun beforeEach() {
        testUser = createUser()
        testEntityManager.persist(testUser)

        testCountry = createCountry()
        testEntityManager.persist(testCountry)
    }

    @Test
    fun `searchTextMatches returns null spec when the search term is null`() {
        assertThat(HouseholdEntity.Specs.searchTextMatches(null, SIMILARITY_THRESHOLD)).isNull()
    }

    @Test
    fun `searchTextMatches matches case insensitively on the main person`() {
        val tag = "Findme${generateRandomLong()}"
        val matching = persistHousehold(customizeMainPerson = { lastname = "Prefix-$tag-Suffix" })
        val notMatching = persistHousehold()
        testEntityManager.flush()

        val result = householdRepository.findAll(searchSpec(tag.uppercase()))

        assertThat(result.map { it.id }).contains(matching.id).doesNotContain(notMatching.id)
    }

    @Test
    fun `searchTextMatches matches on an additional person, not just the main person`() {
        val tag = "Findme${generateRandomLong()}"
        val matching = persistHousehold()
        val additionalPerson = PersonEntity(household = matching, country = testCountry, isMainPerson = false).apply {
            firstname = "child-${generateRandomLong()}"
            lastname = tag
            birthDate = LocalDate.now().minusYears(5)
        }
        matching.persons.add(additionalPerson)
        testEntityManager.persist(additionalPerson)

        val notMatching = persistHousehold()
        testEntityManager.flush()

        val result = householdRepository.findAll(searchSpec(tag))

        assertThat(result.map { it.id }).contains(matching.id).doesNotContain(notMatching.id)
    }

    @Test
    fun `searchTextMatches matches on the household number, address, phone number and e-mail`() {
        val tag = distinctiveNumber()
        val byHouseholdNumber = persistHousehold(customize = { householdId = tag })
        val byStreet = persistHousehold(customize = { addressStreet = "street-$tag" })
        val byCity = persistHousehold(customize = { addressCity = "city-$tag" })
        val byPhone = persistHousehold(customize = { telephoneNumber = "+43 660 $tag" })
        val byEmail = persistHousehold(customize = { email = "$tag@example.com" })
        val notMatching = persistHousehold()
        testEntityManager.flush()

        val result = householdRepository.findAll(searchSpec(tag.toString()))

        assertThat(result.map { it.id })
            .contains(byHouseholdNumber.id, byStreet.id, byCity.id, byPhone.id, byEmail.id)
            .doesNotContain(notMatching.id)
    }

    @Test
    fun `searchTextMatches still finds a household when the name is mistyped`() {
        val tag = distinctiveNumber()
        val matching = persistHousehold(customizeMainPerson = { lastname = "Findme$tag" })
        val notMatching = persistHousehold()
        testEntityManager.flush()

        // "findmr..." instead of "findme..." - close enough for trigrams, not a substring
        val result = householdRepository.findAll(searchSpec("Findmr$tag"))

        assertThat(result.map { it.id }).contains(matching.id).doesNotContain(notMatching.id)
    }

    @Test
    fun `searchTextMatches treats like wildcards as ordinary characters`() {
        val household = persistHousehold()
        testEntityManager.flush()

        val result = householdRepository.findAll(searchSpec("%"))

        assertThat(result.map { it.id }).doesNotContain(household.id)
    }

    @Test
    fun `searchTextMatches follows a person moved to another household`() {
        val tag = "Findme${generateRandomLong()}"
        val source = persistHousehold()
        val target = persistHousehold()

        val movedPerson = PersonEntity(household = source, country = testCountry, isMainPerson = false).apply {
            firstname = "child-${generateRandomLong()}"
            lastname = tag
            birthDate = LocalDate.now().minusYears(5)
        }
        source.persons.add(movedPerson)
        testEntityManager.persist(movedPerson)
        testEntityManager.flush()

        // the re-parenting a household merge does - both households' search text has to follow
        movedPerson.household = target
        testEntityManager.flush()

        val result = householdRepository.findAll(searchSpec(tag))

        assertThat(result.map { it.id }).contains(target.id).doesNotContain(source.id)
    }

    @Test
    fun `postProcessingNecessary matches household whose main person is missing a required field`() {
        val tag = "Findme${generateRandomLong()}"
        val incomplete = persistHousehold(customizeMainPerson = {
            firstname = tag
            gender = null
        })
        val complete = persistHousehold(customizeMainPerson = { firstname = tag })
        testEntityManager.flush()

        val result = householdRepository.findAll(
            HouseholdEntity.Specs.postProcessingNecessary().and(searchSpec(tag)),
        )

        assertThat(result.map { it.id }).contains(incomplete.id).doesNotContain(complete.id)
    }

    @Test
    fun `postProcessingNecessary matches household whose additional person is missing required field`() {
        val tag = "Findme${generateRandomLong()}"
        val withIncompleteAddPerson = persistHousehold(customizeMainPerson = { firstname = tag })
        val incompleteAddPerson = PersonEntity(household = withIncompleteAddPerson, country = testCountry, isMainPerson = false).apply {
            firstname = "child-${generateRandomLong()}"
            lastname = "child-${generateRandomLong()}"
            excludeFromHousehold = false
            receivesFamilyAllowance = false
            birthDate = null
            gender = null
        }
        withIncompleteAddPerson.persons.add(incompleteAddPerson)
        testEntityManager.persist(incompleteAddPerson)

        val complete = persistHousehold(customizeMainPerson = { firstname = tag })
        testEntityManager.flush()

        val result = householdRepository.findAll(
            HouseholdEntity.Specs.postProcessingNecessary().and(searchSpec(tag)),
        )

        assertThat(result.map { it.id }).contains(withIncompleteAddPerson.id).doesNotContain(complete.id)
    }

    @Test
    fun `pendingCostContribution matches households with a pending amount above zero`() {
        val tag = "Findme${generateRandomLong()}"
        val pending = persistHousehold(
            customizeMainPerson = { firstname = tag },
            customize = { pendingCostContribution = BigDecimal("10") },
        )
        val notPending = persistHousehold(
            customizeMainPerson = { firstname = tag },
            customize = { pendingCostContribution = BigDecimal.ZERO },
        )
        testEntityManager.flush()

        val result = householdRepository.findAll(
            HouseholdEntity.Specs.pendingCostContribution().and(searchSpec(tag)),
        )

        assertThat(result.map { it.id }).contains(pending.id).doesNotContain(notPending.id)
    }

    @Test
    fun `validHousehold matches only households with a validUntil today or in the future`() {
        val tag = "Findme${generateRandomLong()}"
        val valid = persistHousehold(
            customizeMainPerson = { firstname = tag },
            customize = { validUntil = LocalDate.now().plusDays(1) },
        )
        val validToday = persistHousehold(
            customizeMainPerson = { firstname = tag },
            customize = { validUntil = LocalDate.now() },
        )
        val expired = persistHousehold(
            customizeMainPerson = { firstname = tag },
            customize = { validUntil = LocalDate.now().minusDays(1) },
        )
        testEntityManager.flush()

        val result = householdRepository.findAll(
            HouseholdEntity.Specs.validHousehold().and(searchSpec(tag)),
        )

        assertThat(result.map { it.id })
            .contains(valid.id, validToday.id)
            .doesNotContain(expired.id)
    }

    @Test
    fun `lockedHousehold matches only locked households`() {
        val tag = "Findme${generateRandomLong()}"
        val lockedHousehold = persistHousehold(
            customizeMainPerson = { firstname = tag },
            customize = { locked = true },
        )
        val unlockedHousehold = persistHousehold(
            customizeMainPerson = { firstname = tag },
            customize = { locked = false },
        )
        testEntityManager.flush()

        val result = householdRepository.findAll(
            HouseholdEntity.Specs.lockedHousehold().and(searchSpec(tag)),
        )

        assertThat(result.map { it.id }).contains(lockedHousehold.id).doesNotContain(unlockedHousehold.id)
    }

    @Test
    fun `missingPrivacyNoticeDocument matches only households with no PRIVACY_NOTICE document`() {
        val tag = "Findme${generateRandomLong()}"
        val withDocument = persistHousehold(customizeMainPerson = { firstname = tag })
        testEntityManager.persist(
            DocumentEntity(
                household = withDocument,
                documentType = DocumentType.PRIVACY_NOTICE,
                fileName = "signed.pdf",
                contentType = "application/pdf",
                storagePath = "/documents/${withDocument.householdId}/signed.pdf",
            ),
        )
        val withOtherDocument = persistHousehold(customizeMainPerson = { firstname = tag })
        testEntityManager.persist(
            DocumentEntity(
                household = withOtherDocument,
                documentType = DocumentType.PROOF_OF_INCOME,
                fileName = "income.pdf",
                contentType = "application/pdf",
                storagePath = "/documents/${withOtherDocument.householdId}/income.pdf",
            ),
        )
        val withoutDocument = persistHousehold(customizeMainPerson = { firstname = tag })
        testEntityManager.flush()

        val result = householdRepository.findAll(
            HouseholdEntity.Specs.missingPrivacyNoticeDocument().and(searchSpec(tag)),
        )

        assertThat(result.map { it.id })
            .contains(withOtherDocument.id, withoutDocument.id)
            .doesNotContain(withDocument.id)
    }

    @Test
    fun `willBeDeletedSoon matches only households whose validUntil falls in the job's cutoff window`() {
        val tag = "Findme${generateRandomLong()}"
        val retentionTime = Period.ofYears(7)

        // deleted next run already - validUntil is before the cutoff, not "soon"
        val alreadyPastCutoff = persistHousehold(
            customizeMainPerson = { firstname = tag },
            customize = { validUntil = LocalDate.now().minus(retentionTime).minusDays(1) },
        )
        // exactly at the cutoff - the job's own boundary is exclusive (validUntil < cutoff), so this
        // is still 30 days out at worst
        val atCutoff = persistHousehold(
            customizeMainPerson = { firstname = tag },
            customize = { validUntil = LocalDate.now().minus(retentionTime) },
        )
        // will be swept in 29 days
        val withinWindow = persistHousehold(
            customizeMainPerson = { firstname = tag },
            customize = { validUntil = LocalDate.now().minus(retentionTime).plusDays(29) },
        )
        // not due for another 31 days
        val outsideWindow = persistHousehold(
            customizeMainPerson = { firstname = tag },
            customize = { validUntil = LocalDate.now().minus(retentionTime).plusDays(31) },
        )
        testEntityManager.flush()

        val result = householdRepository.findAll(
            HouseholdEntity.Specs.willBeDeletedSoon(retentionTime, 30).and(searchSpec(tag)),
        )

        assertThat(result.map { it.id })
            .contains(atCutoff.id, withinWindow.id)
            .doesNotContain(alreadyPastCutoff.id, outsideWindow.id)
    }

    @Test
    fun `willBeDeletedSoon matches nothing when the retention job itself is disabled`() {
        val tag = "Findme${generateRandomLong()}"
        persistHousehold(
            customizeMainPerson = { firstname = tag },
            customize = { validUntil = LocalDate.now() },
        )
        testEntityManager.flush()

        val result = householdRepository.findAll(
            HouseholdEntity.Specs.willBeDeletedSoon(Period.ZERO, 30).and(searchSpec(tag)),
        )

        assertThat(result).isEmpty()
    }

    @Test
    fun `privacyNoticeRetentionDrift matches only a household whose stamped retention period differs from the live one`() {
        val tag = "Findme${generateRandomLong()}"
        val drifted = persistHousehold(customizeMainPerson = { firstname = tag })
        testEntityManager.persist(
            DocumentEntity(
                household = drifted,
                documentType = DocumentType.PRIVACY_NOTICE,
                fileName = "signed.pdf",
                contentType = "application/pdf",
                storagePath = "/documents/${drifted.householdId}/signed.pdf",
            ).apply { retentionPeriodAtUpload = Period.ofYears(7).toString() },
        )
        val upToDate = persistHousehold(customizeMainPerson = { firstname = tag })
        testEntityManager.persist(
            DocumentEntity(
                household = upToDate,
                documentType = DocumentType.PRIVACY_NOTICE,
                fileName = "signed.pdf",
                contentType = "application/pdf",
                storagePath = "/documents/${upToDate.householdId}/signed.pdf",
            ).apply { retentionPeriodAtUpload = Period.ofYears(5).toString() },
        )
        val predatesTheStamp = persistHousehold(customizeMainPerson = { firstname = tag })
        testEntityManager.persist(
            DocumentEntity(
                household = predatesTheStamp,
                documentType = DocumentType.PRIVACY_NOTICE,
                fileName = "signed.pdf",
                contentType = "application/pdf",
                storagePath = "/documents/${predatesTheStamp.householdId}/signed.pdf",
            ),
        )
        val withoutNotice = persistHousehold(customizeMainPerson = { firstname = tag })
        testEntityManager.flush()

        val result = householdRepository.findAll(
            HouseholdEntity.Specs.privacyNoticeRetentionDrift(Period.ofYears(5)).and(searchSpec(tag)),
        )

        assertThat(result.map { it.id })
            .contains(drifted.id)
            .doesNotContain(upToDate.id, predatesTheStamp.id, withoutNotice.id)
    }

    @Test
    fun `privacyNoticeRetentionDrift matches nothing when the retention job itself is disabled`() {
        val tag = "Findme${generateRandomLong()}"
        val household = persistHousehold(customizeMainPerson = { firstname = tag })
        testEntityManager.persist(
            DocumentEntity(
                household = household,
                documentType = DocumentType.PRIVACY_NOTICE,
                fileName = "signed.pdf",
                contentType = "application/pdf",
                storagePath = "/documents/${household.householdId}/signed.pdf",
            ).apply { retentionPeriodAtUpload = Period.ofYears(7).toString() },
        )
        testEntityManager.flush()

        val result = householdRepository.findAll(
            HouseholdEntity.Specs.privacyNoticeRetentionDrift(Period.ZERO).and(searchSpec(tag)),
        )

        assertThat(result).isEmpty()
    }

    @Test
    fun `orderBySearchRelevance sorts the verbatim match before the merely similar one`() {
        val tag = distinctiveNumber()
        val fuzzyHit = persistHousehold(customizeMainPerson = { lastname = "Findmr$tag" })
        testEntityManager.flush()

        Thread.sleep(50)

        // persisted later, so it would come first on updatedAt alone
        val verbatimHit = persistHousehold(customizeMainPerson = { lastname = "Findme$tag" })
        testEntityManager.flush()

        val searchTerm = SearchTextSpecs.normalize("Findme$tag")
        val spec = HouseholdEntity.Specs.orderBySearchRelevance(searchTerm, searchSpec("Findme$tag"))
        val result = householdRepository.findAll(spec)

        assertThat(result.map { it.id }).containsExactly(verbatimHit.id, fuzzyHit.id)
    }

    @Test
    fun `orderBySearchRelevance sorts the most recently updated household first without a search term`() {
        val tag = "Findme${generateRandomLong()}"
        val first = persistHousehold(customizeMainPerson = { firstname = tag })
        testEntityManager.flush()

        Thread.sleep(50)

        val second = persistHousehold(customizeMainPerson = { firstname = tag })
        testEntityManager.flush()

        val spec = HouseholdEntity.Specs.orderBySearchRelevance(null, searchSpec(tag))
        val result = householdRepository.findAll(spec)

        assertThat(result.map { it.id }).containsExactly(second.id, first.id)
    }

    @Test
    fun `orderBySearchRelevance sorts by the requested column, overriding the default order`() {
        val tag = "Findme${generateRandomLong()}"
        val bravo = persistHousehold(customizeMainPerson = { lastname = "Bravo-$tag" })
        testEntityManager.flush()

        Thread.sleep(50)

        // persisted later, so it would come first under the default (most-recently-updated) order
        val alpha = persistHousehold(customizeMainPerson = { lastname = "Alpha-$tag" })
        testEntityManager.flush()

        val spec = HouseholdEntity.Specs.orderBySearchRelevance(null, searchSpec(tag), sortBy = "name", sortDirection = "asc")
        val result = householdRepository.findAll(spec)

        assertThat(result.map { it.id }).containsExactly(alpha.id, bravo.id)
    }

    @Test
    fun `orderBySearchRelevance sorts descending when no direction or an unrecognized one is given`() {
        val tag = "Findme${generateRandomLong()}"
        val alpha = persistHousehold(customizeMainPerson = { lastname = "Alpha-$tag" })
        val bravo = persistHousehold(customizeMainPerson = { lastname = "Bravo-$tag" })
        testEntityManager.flush()

        val spec = HouseholdEntity.Specs.orderBySearchRelevance(null, searchSpec(tag), sortBy = "name", sortDirection = null)
        val result = householdRepository.findAll(spec)

        assertThat(result.map { it.id }).containsExactly(bravo.id, alpha.id)
    }

    @Test
    fun `orderBySearchRelevance sorts by validUntil when requested`() {
        val tag = "Findme${generateRandomLong()}"
        val earlier = persistHousehold(
            customizeMainPerson = { firstname = tag },
            customize = { validUntil = LocalDate.now().plusDays(1) },
        )
        val later = persistHousehold(
            customizeMainPerson = { firstname = tag },
            customize = { validUntil = LocalDate.now().plusDays(10) },
        )
        testEntityManager.flush()

        val spec = HouseholdEntity.Specs.orderBySearchRelevance(null, searchSpec(tag), sortBy = "validUntil", sortDirection = "asc")
        val result = householdRepository.findAll(spec)

        assertThat(result.map { it.id }).containsExactly(earlier.id, later.id)
    }

    /**
     * A number long enough that it cannot accidentally turn up inside another household's search
     * text - which a short one plausibly could, since that text holds postal codes, phone numbers
     * and household numbers too.
     */
    private fun distinctiveNumber(): Long = 1_000_000_000_000L + generateRandomLong()

    private fun searchSpec(searchInput: String) = HouseholdEntity.Specs.searchTextMatches(
        SearchTextSpecs.normalize(searchInput),
        SIMILARITY_THRESHOLD,
    )!!

    /**
     * Households and persons reference each other, so the main person pointer can only be written
     * after both rows exist - the same two-step insert the application uses.
     */
    private fun persistHousehold(
        customizeMainPerson: PersonEntity.() -> Unit = {},
        customize: HouseholdEntity.() -> Unit = {},
    ): HouseholdEntity {
        val household = createHousehold(testUser.employee!!, testCountry)
        household.customize()
        household.persons.first { it.isMainPerson }.customizeMainPerson()

        testEntityManager.persist(household)
        testEntityManager.flush()

        household.mainPerson = household.persons.first { it.isMainPerson }
        testEntityManager.persist(household)
        testEntityManager.flush()

        return household
    }
}
