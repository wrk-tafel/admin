package at.wrk.tafel.admin.backend.modules.household.internal

import at.wrk.tafel.admin.backend.database.model.auth.UserEntity
import at.wrk.tafel.admin.backend.database.model.distribution.DistributionEntity
import at.wrk.tafel.admin.backend.database.model.distribution.DistributionHouseholdEntity
import at.wrk.tafel.admin.backend.database.model.household.HouseholdEntity
import at.wrk.tafel.admin.backend.database.model.person.PersonEntity
import at.wrk.tafel.admin.backend.database.model.staticdata.CountryEntity
import at.wrk.tafel.admin.backend.modules.base.country.CountryItem
import at.wrk.tafel.admin.backend.modules.household.HouseholdMergeField
import at.wrk.tafel.admin.backend.modules.household.Person
import org.assertj.core.api.Assertions.assertThat
import org.junit.jupiter.api.Test
import java.math.BigDecimal
import java.time.LocalDate
import java.time.LocalDateTime

class HouseholdMergePlannerTest {

    private val testCountry = CountryEntity().apply {
        id = 1
        code = "AT"
        name = "Austria"
    }
    private val otherCountry = CountryEntity().apply {
        id = 2
        code = "DE"
        name = "Germany"
    }

    private val fakePersonMapper: (PersonEntity) -> Person = { p ->
        Person(
            id = p.id,
            isMainPerson = p.isMainPerson,
            firstname = p.firstname,
            lastname = p.lastname,
            birthDate = p.birthDate,
            gender = null,
            country = CountryItem(id = 1, code = "AT", name = "Austria"),
            employer = p.employer,
            income = p.income,
            incomeDue = p.incomeDue,
            receivesFamilyAllowance = p.receivesFamilyAllowance,
            excludeFromHousehold = p.excludeFromHousehold,
        )
    }

    private var nextId = 1L
    private fun nextId() = nextId++

    private fun household(householdId: Long, mainPersonName: Pair<String, String> = "Max" to "Mustermann", birthDate: LocalDate = LocalDate.of(1990, 1, 1)): HouseholdEntity {
        val household = HouseholdEntity().apply {
            id = nextId()
            this.householdId = householdId
            addressStreet = "Street"
            addressHouseNumber = "1"
            addressPostalCode = 1010
            addressCity = "Vienna"
        }
        val mainPerson = PersonEntity().apply {
            id = nextId()
            this.household = household
            isMainPerson = true
            firstname = mainPersonName.first
            lastname = mainPersonName.second
            this.birthDate = birthDate
            country = testCountry
        }
        household.mainPerson = mainPerson
        household.persons.add(mainPerson)
        return household
    }

    private fun addAdditionalPerson(household: HouseholdEntity, firstname: String, lastname: String, birthDate: LocalDate?): PersonEntity {
        val person = PersonEntity().apply {
            id = nextId()
            this.household = household
            isMainPerson = false
            this.firstname = firstname
            this.lastname = lastname
            this.birthDate = birthDate
            country = testCountry
        }
        household.persons.add(person)
        return person
    }

    // ---------------------------------------------------------------------------
    // Field conflicts

    @Test
    fun `identical address is not reported as a conflict`() {
        val target = household(1)
        val source = household(2)

        val plan = HouseholdMergePlanner.buildPlan(target, listOf(source), emptyList(), fakePersonMapper)

        assertThat(plan.fieldConflicts).isEmpty()
    }

    @Test
    fun `differing telephone number is reported as a conflict with the conflicting source id`() {
        val target = household(1).apply { telephoneNumber = "111" }
        val source = household(2).apply { telephoneNumber = "222" }

        val plan = HouseholdMergePlanner.buildPlan(target, listOf(source), emptyList(), fakePersonMapper)

        assertThat(plan.fieldConflicts).extracting<HouseholdMergeField> { it.field }.containsExactly(HouseholdMergeField.TELEPHONE_NUMBER)
        assertThat(plan.fieldConflicts.single().conflictingSourceHouseholdIds).containsExactly(2L)
    }

    @Test
    fun `blank vs null telephone number is not a conflict`() {
        val target = household(1).apply { telephoneNumber = null }
        val source = household(2).apply { telephoneNumber = "   " }

        val plan = HouseholdMergePlanner.buildPlan(target, listOf(source), emptyList(), fakePersonMapper)

        assertThat(plan.fieldConflicts).isEmpty()
    }

    @Test
    fun `pending cost contribution compares by value not scale`() {
        val target = household(1).apply { pendingCostContribution = BigDecimal("0") }
        val source = household(2).apply { pendingCostContribution = BigDecimal("0.00") }

        val plan = HouseholdMergePlanner.buildPlan(target, listOf(source), emptyList(), fakePersonMapper)

        assertThat(plan.fieldConflicts).isEmpty()
    }

    @Test
    fun `differing main person birthdate is reported under the MAIN_PERSON_BIRTHDATE field`() {
        val target = household(1, birthDate = LocalDate.of(1990, 1, 1))
        val source = household(2, birthDate = LocalDate.of(1991, 2, 2))

        val plan = HouseholdMergePlanner.buildPlan(target, listOf(source), emptyList(), fakePersonMapper)

        assertThat(plan.fieldConflicts).extracting<HouseholdMergeField> { it.field }.contains(HouseholdMergeField.MAIN_PERSON_BIRTHDATE)
    }

    @Test
    fun `applyField for ADDRESS copies the whole address as one atomic group`() {
        val target = household(1).apply {
            addressStreet = "Target street"
            addressHouseNumber = "1"
            addressCity = "Vienna"
        }
        val source = household(2).apply {
            addressStreet = "Source street"
            addressHouseNumber = "9"
            addressStairway = "2"
            addressDoor = "3"
            addressPostalCode = 2020
            addressCity = "Graz"
        }

        HouseholdMergePlanner.applyField(HouseholdMergeField.ADDRESS, target, source)

        assertThat(target.addressStreet).isEqualTo("Source street")
        assertThat(target.addressHouseNumber).isEqualTo("9")
        assertThat(target.addressStairway).isEqualTo("2")
        assertThat(target.addressDoor).isEqualTo("3")
        assertThat(target.addressPostalCode).isEqualTo(2020)
        assertThat(target.addressCity).isEqualTo("Graz")
    }

    @Test
    fun `applyField for LOCK_STATE copies locked, lockedAt, lockedBy and lockReason together`() {
        val lockedAt = LocalDateTime.now()
        val lockedBy = UserEntity().apply { id = 42 }
        val target = household(1)
        val source = household(2).apply {
            locked = true
            this.lockedAt = lockedAt
            this.lockedBy = lockedBy
            lockReason = "fraud suspicion"
        }

        HouseholdMergePlanner.applyField(HouseholdMergeField.LOCK_STATE, target, source)

        assertThat(target.locked).isTrue()
        assertThat(target.lockedAt).isEqualTo(lockedAt)
        assertThat(target.lockedBy).isEqualTo(lockedBy)
        assertThat(target.lockReason).isEqualTo("fraud suspicion")
    }

    @Test
    fun `applyField for MAIN_PERSON_COUNTRY assigns the winner's already-managed CountryEntity`() {
        val target = household(1)
        val source = household(2).apply { mainPerson!!.country = otherCountry }

        HouseholdMergePlanner.applyField(HouseholdMergeField.MAIN_PERSON_COUNTRY, target, source)

        assertThat(target.mainPerson!!.country).isEqualTo(otherCountry)
    }

    // ---------------------------------------------------------------------------
    // Person re-parenting + de-duplication

    @Test
    fun `additional person matching the target by name and birthdate is dropped as a duplicate`() {
        val target = household(1)
        addAdditionalPerson(target, "Anna", "Schmidt", LocalDate.of(1990, 5, 17))

        val source = household(2)
        val sourceDuplicate = addAdditionalPerson(source, " ANNA ", "schmidt", LocalDate.of(1990, 5, 17))

        val plan = HouseholdMergePlanner.buildPlan(target, listOf(source), emptyList(), fakePersonMapper)

        assertThat(plan.personIdsToMove).doesNotContain(sourceDuplicate.id)
        assertThat(plan.duplicatePersonIdToMatchedTargetPersonId).containsKey(sourceDuplicate.id)
        assertThat(plan.personItems.single { it.person.id == sourceDuplicate.id }.duplicate).isTrue()
    }

    @Test
    fun `additional person with no match on the target is moved`() {
        // distinct main-person identities so only the explicitly-added additional person is at play
        val target = household(1, mainPersonName = "Target" to "Main")
        val source = household(2, mainPersonName = "Source" to "Main")
        val newPerson = addAdditionalPerson(source, "Peter", "Novak", LocalDate.of(1985, 1, 1))

        val plan = HouseholdMergePlanner.buildPlan(target, listOf(source), emptyList(), fakePersonMapper)

        assertThat(plan.personIdsToMove).contains(newPerson.id)
        assertThat(plan.duplicatePersonIdToMatchedTargetPersonId).doesNotContainKey(newPerson.id)
    }

    @Test
    fun `a person missing a birthdate never matches, even with an identical name`() {
        val target = household(1, mainPersonName = "Target" to "Main")
        addAdditionalPerson(target, "Anna", "Schmidt", null)

        val source = household(2, mainPersonName = "Source" to "Main")
        val sourcePerson = addAdditionalPerson(source, "Anna", "Schmidt", null)

        val plan = HouseholdMergePlanner.buildPlan(target, listOf(source), emptyList(), fakePersonMapper)

        assertThat(plan.personIdsToMove).contains(sourcePerson.id)
        assertThat(plan.duplicatePersonIdToMatchedTargetPersonId).doesNotContainKey(sourcePerson.id)
    }

    @Test
    fun `two sources both carrying an identical person absent from the target are deduplicated against each other`() {
        val target = household(1, mainPersonName = "Target" to "Main")
        val source1 = household(2, mainPersonName = "Source1" to "Main")
        val source2 = household(3, mainPersonName = "Source2" to "Main")
        val firstOccurrence = addAdditionalPerson(source1, "Peter", "Novak", LocalDate.of(1985, 1, 1))
        val secondOccurrence = addAdditionalPerson(source2, "Peter", "Novak", LocalDate.of(1985, 1, 1))

        val plan = HouseholdMergePlanner.buildPlan(target, listOf(source1, source2), emptyList(), fakePersonMapper)

        assertThat(plan.personIdsToMove).contains(firstOccurrence.id).doesNotContain(secondOccurrence.id)
        assertThat(plan.duplicatePersonIdToMatchedTargetPersonId).containsEntry(secondOccurrence.id, firstOccurrence.id)
    }

    // ---------------------------------------------------------------------------
    // Distribution collisions

    private fun distribution(id: Long) = DistributionEntity().apply {
        this.id = id
        startedAt = LocalDateTime.now()
    }

    private fun distributionRow(household: HouseholdEntity, distribution: DistributionEntity, ticketNumber: Int, processed: Boolean? = false, costContributionPaid: Boolean? = true) = DistributionHouseholdEntity().apply {
        id = nextId()
        this.household = household
        this.distribution = distribution
        this.ticketNumber = ticketNumber
        this.processed = processed
        this.costContributionPaid = costContributionPaid
    }

    @Test
    fun `rows for distinct distributions never collide - the source's row is just moved`() {
        val target = household(1)
        val source = household(2)
        val distribution1 = distribution(1)
        val distribution2 = distribution(2)
        val targetRow = distributionRow(target, distribution1, ticketNumber = 1)
        val sourceRow = distributionRow(source, distribution2, ticketNumber = 2)

        val plan = HouseholdMergePlanner.buildPlan(target, listOf(source), listOf(targetRow, sourceRow), fakePersonMapper)

        assertThat(plan.distributionRowIdsToMove).containsExactly(sourceRow.id)
        assertThat(plan.distributionRowIdsToDrop).isEmpty()
        assertThat(plan.distributionFlagUpdates).isEmpty()
    }

    @Test
    fun `same-distribution collision keeps the target's row and drops the source's, folding flags`() {
        val target = household(1)
        val source = household(2)
        val distribution = distribution(1)
        val targetRow = distributionRow(target, distribution, ticketNumber = 5, processed = false, costContributionPaid = true)
        val sourceRow = distributionRow(source, distribution, ticketNumber = 9, processed = true, costContributionPaid = false)

        val plan = HouseholdMergePlanner.buildPlan(target, listOf(source), listOf(targetRow, sourceRow), fakePersonMapper)

        assertThat(plan.distributionRowIdsToMove).isEmpty() // the winner is already on the target
        assertThat(plan.distributionRowIdsToDrop).containsExactly(sourceRow.id)
        assertThat(plan.distributionFlagUpdates).containsEntry(targetRow.id, true to false)
        assertThat(plan.distributionCollisions.single().targetTicketNumber).isEqualTo(5)
        assertThat(plan.distributionCollisions.single().sourceTicketNumber).isEqualTo(9)
        assertThat(plan.distributionCollisions.single().sourceHouseholdId).isEqualTo(2L)
    }

    @Test
    fun `two sources colliding with no target row - the lowest-id source row wins and is moved`() {
        val target = household(1)
        val source1 = household(2)
        val source2 = household(3)
        val distribution = distribution(1)
        val source1Row = distributionRow(source1, distribution, ticketNumber = 3, processed = false, costContributionPaid = true)
        val source2Row = distributionRow(source2, distribution, ticketNumber = 7, processed = true, costContributionPaid = true)

        val plan = HouseholdMergePlanner.buildPlan(target, listOf(source1, source2), listOf(source1Row, source2Row), fakePersonMapper)

        assertThat(plan.distributionRowIdsToMove).containsExactly(source1Row.id)
        assertThat(plan.distributionRowIdsToDrop).containsExactly(source2Row.id)
        assertThat(plan.distributionFlagUpdates).containsEntry(source1Row.id, true to true)
    }
}
