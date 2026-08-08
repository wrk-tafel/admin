package at.wrk.tafel.admin.backend.database.model.logistics

import at.wrk.tafel.admin.backend.TafelBaseIntegrationTest
import at.wrk.tafel.admin.backend.common.test.TestdataGenerator.createDistribution
import at.wrk.tafel.admin.backend.common.test.TestdataGenerator.createUser
import at.wrk.tafel.admin.backend.common.test.TestdataGenerator.generateRandomLong
import at.wrk.tafel.admin.backend.database.model.auth.UserEntity
import org.assertj.core.api.Assertions.assertThat
import org.junit.jupiter.api.BeforeEach
import org.junit.jupiter.api.Test
import org.springframework.beans.factory.annotation.Autowired
import org.springframework.boot.jpa.test.autoconfigure.TestEntityManager
import org.springframework.boot.jpa.test.autoconfigure.find
import org.springframework.transaction.annotation.Transactional
import java.math.BigDecimal

/**
 * The weight of a collected item is stored on `food_collections_items` (R__00086) instead of being
 * derived from the shop's `food_unit` and the category's `weight_per_unit` on every read - otherwise
 * editing that master data rewrites the kg of distributions that are already closed. Only a real
 * database run proves the column is actually written and read back; a mocked-repository unit test
 * would pass either way.
 */
class FoodCollectionItemWeightIT : TafelBaseIntegrationTest() {

    @Autowired
    private lateinit var testEntityManager: TestEntityManager

    private lateinit var testUser: UserEntity
    private lateinit var shop: ShopEntity
    private lateinit var category: FoodCategoryEntity
    private lateinit var route: RouteEntity

    @BeforeEach
    fun beforeEach() {
        val randomNumber = generateRandomLong()

        testUser = createUser()
        testEntityManager.persist(testUser)

        shop = ShopEntity(
            number = randomNumber.toInt(),
            name = "shop-$randomNumber",
            address = ShopAddress(postalCode = 1234, street = "street", city = "city"),
            foodUnit = FoodUnit.BOX,
        )
        testEntityManager.persist(shop)

        category = FoodCategoryEntity(name = "category-$randomNumber", sortOrder = 1).apply {
            weightPerUnit = BigDecimal("2")
        }
        testEntityManager.persist(category)

        route = RouteEntity(number = randomNumber.toDouble(), name = "route-$randomNumber")
        testEntityManager.persist(route)
    }

    @Test
    @Transactional
    fun `item weight is persisted and survives a later change of the category weight per unit`() {
        val distribution = createDistribution(testUser)
        testEntityManager.persist(distribution)

        val foodCollection = FoodCollectionEntity(distribution = distribution, route = route).apply {
            items = listOf(FoodCollectionItemEntity(shop = shop, category = category, amount = 5))
        }
        testEntityManager.persist(foodCollection)
        testEntityManager.flush()
        testEntityManager.clear()

        val persisted = testEntityManager.find<FoodCollectionEntity>(foodCollection.id!!)
        assertThat(persisted!!.items).singleElement()
            .satisfies({ assertThat(it.weight).isEqualByComparingTo(BigDecimal("10")) })

        // the settings screen lets an operator change this at any time, long after the collection was recorded
        val storedCategory = testEntityManager.find<FoodCategoryEntity>(category.id!!)!!
        storedCategory.weightPerUnit = BigDecimal("100")
        testEntityManager.flush()
        testEntityManager.clear()

        val reloaded = testEntityManager.find<FoodCollectionEntity>(foodCollection.id!!)
        assertThat(reloaded!!.items).singleElement()
            .satisfies({ assertThat(it.weight).isEqualByComparingTo(BigDecimal("10")) })
    }

    @Test
    @Transactional
    fun `updating the amount rewrites the stored weight`() {
        val distribution = createDistribution(testUser)
        testEntityManager.persist(distribution)

        val item = FoodCollectionItemEntity(shop = shop, category = category, amount = 5)
        val foodCollection = FoodCollectionEntity(distribution = distribution, route = route).apply {
            items = listOf(item)
        }
        testEntityManager.persist(foodCollection)
        testEntityManager.flush()

        item.updateAmount(7)
        testEntityManager.flush()
        testEntityManager.clear()

        val persisted = testEntityManager.find<FoodCollectionEntity>(foodCollection.id!!)
        assertThat(persisted!!.items).singleElement()
            .satisfies({ assertThat(it.weight).isEqualByComparingTo(BigDecimal("14")) })
    }
}
