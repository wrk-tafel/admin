package at.wrk.tafel.admin.backend.modules.household.internal

import at.wrk.tafel.admin.backend.TafelBaseIntegrationTest
import at.wrk.tafel.admin.backend.common.test.TestdataGenerator.createCountry
import at.wrk.tafel.admin.backend.common.test.TestdataGenerator.createDistribution
import at.wrk.tafel.admin.backend.common.test.TestdataGenerator.createHousehold
import at.wrk.tafel.admin.backend.common.test.TestdataGenerator.createUser
import at.wrk.tafel.admin.backend.database.model.auth.UserEntity
import at.wrk.tafel.admin.backend.database.model.distribution.DistributionEntity
import at.wrk.tafel.admin.backend.database.model.distribution.DistributionHouseholdEntity
import at.wrk.tafel.admin.backend.database.model.household.HouseholdEntity
import at.wrk.tafel.admin.backend.database.model.staticdata.CountryEntity
import org.assertj.core.api.Assertions.assertThat
import org.junit.jupiter.api.BeforeEach
import org.junit.jupiter.api.Disabled
import org.junit.jupiter.api.Test
import org.springframework.beans.factory.annotation.Autowired
import org.springframework.boot.jpa.test.autoconfigure.TestEntityManager
import org.springframework.transaction.annotation.Transactional

class HouseholdServiceIT : TafelBaseIntegrationTest() {

    @Autowired
    private lateinit var testEntityManager: TestEntityManager

    @Autowired
    private lateinit var householdService: HouseholdService

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
    @Disabled // TODO re-enable when merge logic is enhanced
    @Transactional
    fun `merge households`() {
        val distribution1 = createDistribution(testUser)
        testEntityManager.persist(distribution1)

        val distribution2 = createDistribution(testUser)
        testEntityManager.persist(distribution2)

        val targetHousehold = persistHousehold()
        val sourceHousehold1 = persistHousehold()
        val sourceHousehold2 = persistHousehold()
        val sourceHousehold3 = persistHousehold()

        createDistributionHouseholdEntity(household = targetHousehold, distribution = distribution1, ticketNumber = 1)
        createDistributionHouseholdEntity(household = sourceHousehold1, distribution = distribution1, ticketNumber = 2)

        createDistributionHouseholdEntity(household = sourceHousehold2, distribution = distribution2, ticketNumber = 1)
        createDistributionHouseholdEntity(household = sourceHousehold3, distribution = distribution2, ticketNumber = 2)

        testEntityManager.flush()
        testEntityManager.clear()

        householdService.mergeHouseholds(
            targetHousehold.householdId!!,
            listOf(
                sourceHousehold1.householdId!!,
                sourceHousehold2.householdId!!,
                sourceHousehold3.householdId!!
            )
        )

        testEntityManager.flush()
        testEntityManager.clear()

        // targetHousehold still exists
        assertThat(testEntityManager.find(HouseholdEntity::class.java, targetHousehold.id as Any)).isNotNull

        // sourceHouseholds are deleted
        assertThat(testEntityManager.find(HouseholdEntity::class.java, sourceHousehold1.id as Any)).isNull()
        assertThat(testEntityManager.find(HouseholdEntity::class.java, sourceHousehold2.id as Any)).isNull()
        assertThat(testEntityManager.find(HouseholdEntity::class.java, sourceHousehold3.id as Any)).isNull()
    }

    private fun persistHousehold(): HouseholdEntity {
        val household = createHousehold(testUser.employee!!, testCountry)
        testEntityManager.persist(household)
        testEntityManager.flush()

        household.mainPerson = household.persons.first { it.isMainPerson }
        testEntityManager.persist(household)
        testEntityManager.flush()

        return household
    }

    private fun createDistributionHouseholdEntity(
        household: HouseholdEntity,
        distribution: DistributionEntity,
        ticketNumber: Int
    ): DistributionHouseholdEntity {
        val distributionHouseholdEntity = DistributionHouseholdEntity()

        distributionHouseholdEntity.household = household
        distributionHouseholdEntity.distribution = distribution
        distributionHouseholdEntity.ticketNumber = ticketNumber
        distributionHouseholdEntity.processed = false

        testEntityManager.persist(distributionHouseholdEntity)
        return distributionHouseholdEntity
    }

}
