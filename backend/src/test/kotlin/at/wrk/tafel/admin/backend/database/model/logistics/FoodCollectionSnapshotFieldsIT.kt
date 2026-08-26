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

/**
 * `FoodCollectionEntity.routeName`/`FoodCollectionItemEntity.shopNumber`/`.categoryName` are stored
 * at record time (R__00108) instead of being read live off `routes`/`shops`/`food_categories` on
 * every export - otherwise renaming any of them rewrites the TOeT_Spenden export for distributions
 * that already happened, the same problem R__00086 fixed for the weight itself. Only a real database
 * run proves the columns are actually written and read back; a mocked-repository unit test would
 * pass either way.
 */
class FoodCollectionSnapshotFieldsIT : TafelBaseIntegrationTest() {

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

        category = FoodCategoryEntity(name = "category-$randomNumber", sortOrder = 1)
        testEntityManager.persist(category)

        route = RouteEntity(number = randomNumber.toDouble(), name = "route-$randomNumber")
        testEntityManager.persist(route)
    }

    @Test
    @Transactional
    fun `route name, shop number and category name are persisted and survive a later rename`() {
        val distribution = createDistribution(testUser)
        testEntityManager.persist(distribution)

        val foodCollection = FoodCollectionEntity(distribution = distribution, route = route).apply {
            items = listOf(FoodCollectionItemEntity(shop = shop, category = category, amount = 5))
        }
        testEntityManager.persist(foodCollection)
        testEntityManager.flush()
        testEntityManager.clear()

        val persisted = testEntityManager.find<FoodCollectionEntity>(foodCollection.id!!)
        assertThat(persisted!!.routeName).isEqualTo(route.name)
        assertThat(persisted.items).singleElement().satisfies({
            assertThat(it.shopNumber).isEqualTo(shop.number)
            assertThat(it.categoryName).isEqualTo(category.name)
        })

        // the settings screens let an operator rename any of these at any time, long after the
        // collection was recorded
        val storedRoute = testEntityManager.find<RouteEntity>(route.id!!)!!
        storedRoute.name = "renamed route"
        val storedShop = testEntityManager.find<ShopEntity>(shop.id!!)!!
        storedShop.number = shop.number + 1
        val storedCategory = testEntityManager.find<FoodCategoryEntity>(category.id!!)!!
        storedCategory.name = "renamed category"
        testEntityManager.flush()
        testEntityManager.clear()

        val reloaded = testEntityManager.find<FoodCollectionEntity>(foodCollection.id!!)
        assertThat(reloaded!!.routeName).isEqualTo(route.name)
        assertThat(reloaded.items).singleElement().satisfies({
            assertThat(it.shopNumber).isEqualTo(shop.number)
            assertThat(it.categoryName).isEqualTo(category.name)
        })
    }
}
