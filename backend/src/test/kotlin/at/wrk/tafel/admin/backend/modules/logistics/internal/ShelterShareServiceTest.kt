package at.wrk.tafel.admin.backend.modules.logistics.internal

import at.wrk.tafel.admin.backend.database.model.distribution.DistributionEntity
import at.wrk.tafel.admin.backend.database.model.distribution.DistributionRepository
import at.wrk.tafel.admin.backend.database.model.logistics.FoodCategoryEntity
import at.wrk.tafel.admin.backend.database.model.logistics.FoodCollectionEntity
import at.wrk.tafel.admin.backend.database.model.logistics.FoodCollectionItemEntity
import at.wrk.tafel.admin.backend.database.model.logistics.FoodUnit
import at.wrk.tafel.admin.backend.database.model.logistics.RouteEntity
import at.wrk.tafel.admin.backend.database.model.logistics.ShelterEntity
import at.wrk.tafel.admin.backend.database.model.logistics.ShelterFixedQuantityEntity
import at.wrk.tafel.admin.backend.database.model.logistics.ShopAddress
import at.wrk.tafel.admin.backend.database.model.logistics.ShopEntity
import at.wrk.tafel.admin.backend.modules.logistics.model.ShelterShareCategoryItem
import at.wrk.tafel.admin.backend.modules.logistics.model.ShelterSharesResponse
import io.mockk.every
import io.mockk.impl.annotations.InjectMockKs
import io.mockk.impl.annotations.RelaxedMockK
import io.mockk.junit5.MockKExtension
import io.mockk.mockk
import org.assertj.core.api.Assertions.assertThat
import org.junit.jupiter.api.Test
import org.junit.jupiter.api.extension.ExtendWith
import java.math.BigDecimal

@ExtendWith(MockKExtension::class)
class ShelterShareServiceTest {

    @RelaxedMockK
    private lateinit var distributionRepository: DistributionRepository

    @InjectMockKs
    private lateinit var service: ShelterShareService

    private val fruit = FoodCategoryEntity(name = "Obst / Gemüse", sortOrder = 1).apply { id = 1 }
    private val bread = FoodCategoryEntity(name = "Backwaren", sortOrder = 2).apply { id = 2 }
    private val meat = FoodCategoryEntity(name = "Fleisch / Fisch", sortOrder = 3).apply {
        id = 3
        weightPerUnit = BigDecimal("10")
        needsCooking = true
    }
    private val boxShop = ShopEntity(number = 1, name = "Billa", address = ShopAddress(street = "S", postalCode = 1, city = "C")).apply { id = 1 }
    private val kgShop = ShopEntity(
        number = 2,
        name = "Bäckerei",
        address = ShopAddress(street = "S", postalCode = 1, city = "C"),
        foodUnit = FoodUnit.KG,
    ).apply { id = 2 }
    private val route1 = RouteEntity(number = 1.0, name = "Route 1").apply { id = 1 }
    private val route2 = RouteEntity(number = 2.0, name = "Route 2").apply { id = 2 }

    @Test
    fun `shares what a route collected evenly per person between households and its shelters`() {
        val shelter = shelter(id = 10, persons = 10, needs = setOf(fruit))

        val shares = calculate(householdPersons = 90, collection(route1, items = listOf(item(fruit, 20)), shelters = setOf(shelter)))

        // 20 boxes for 100 persons - the 10 in the shelter get 2
        assertThat(sharesOf(shares, 10)).containsExactly(ShelterShareCategoryItem(1, "Obst / Gemüse", 2))
        assertThat(shares.householdPersons).isEqualTo(90)
        assertThat(shares.shelterPersons).isEqualTo(10)
        assertThat(shares.totalBoxes).isEqualTo(2)
    }

    @Test
    fun `takes fixed quantities off the top before sharing the rest`() {
        val shelter = shelter(id = 10, persons = 10, needs = setOf(bread)).apply {
            fixedQuantities = mutableListOf(ShelterFixedQuantityEntity(foodCategory = bread, amount = 4, note = "Schnittbrot"))
        }

        val shares = calculate(householdPersons = 90, collection(route1, items = listOf(item(bread, 24)), shelters = setOf(shelter)))

        // 4 fixed, then 20 left for 100 persons - 2 more
        assertThat(sharesOf(shares, 10)).containsExactly(ShelterShareCategoryItem(2, "Backwaren", 6))
    }

    @Test
    fun `never gives more fixed boxes than the route collected`() {
        val shelter = shelter(id = 10, persons = 10, needs = emptySet()).apply {
            fixedQuantities = mutableListOf(ShelterFixedQuantityEntity(foodCategory = bread, amount = 4))
        }

        val shares = calculate(householdPersons = 0, collection(route1, items = listOf(item(bread, 3)), shelters = setOf(shelter)))

        assertThat(sharesOf(shares, 10)).containsExactly(ShelterShareCategoryItem(2, "Backwaren", 3))
    }

    @Test
    fun `leaves what a shelter does not want, or cannot cook, with the households`() {
        val noKitchen = shelter(id = 10, persons = 50, needs = setOf(fruit, meat), kitchen = null)
        val excludes = shelter(id = 11, persons = 50, needs = setOf(fruit, meat), kitchen = true).apply {
            excludedFoodCategories = mutableSetOf(fruit)
        }

        val shares = calculate(
            householdPersons = 0,
            collection(route1, items = listOf(item(fruit, 10), item(meat, 10)), shelters = setOf(noKitchen, excludes)),
        )

        // fruit only to the one without a kitchen, meat only to the one that can cook it
        assertThat(sharesOf(shares, 10)).containsExactly(ShelterShareCategoryItem(1, "Obst / Gemüse", 5))
        assertThat(sharesOf(shares, 11)).containsExactly(ShelterShareCategoryItem(3, "Fleisch / Fisch", 5))
    }

    @Test
    fun `gives a shelter no more than its own route collected`() {
        val shelter = shelter(id = 10, persons = 50, needs = setOf(fruit))

        val shares = calculate(
            householdPersons = 50,
            collection(route1, items = listOf(item(fruit, 1)), shelters = setOf(shelter)),
            collection(route2, items = listOf(item(fruit, 99)), shelters = emptySet()),
        )

        // 100 boxes for 100 persons would be 50, but route 1 brought only one
        assertThat(sharesOf(shares, 10)).containsExactly(ShelterShareCategoryItem(1, "Obst / Gemüse", 1))
    }

    @Test
    fun `turns kilograms into boxes through the category's weight per box, rounding down`() {
        val shelter = shelter(id = 10, persons = 50, needs = setOf(meat), kitchen = true)

        // 75 kg at 10 kg per box are 7.5 boxes - half of them is 3.75, so 3
        val shares = calculate(householdPersons = 50, collection(route1, items = listOf(item(meat, 75, kgShop)), shelters = setOf(shelter)))

        assertThat(sharesOf(shares, 10)).containsExactly(ShelterShareCategoryItem(3, "Fleisch / Fisch", 3))
    }

    @Test
    fun `counts a shelter picked for two routes once, served by the first`() {
        val shelter = shelter(id = 10, persons = 10, needs = setOf(fruit))

        val shares = calculate(
            householdPersons = 90,
            collection(route2, items = listOf(item(fruit, 20)), shelters = setOf(shelter)),
            collection(route1, items = listOf(item(fruit, 20)), shelters = setOf(shelter)),
        )

        assertThat(shares.shelterPersons).isEqualTo(10)
        assertThat(shares.routes.map { it.routeId }).containsExactly(1L)
        assertThat(sharesOf(shares, 10)).containsExactly(ShelterShareCategoryItem(1, "Obst / Gemüse", 4))
    }

    @Test
    fun `lists a route's shelters even when nothing has been collected yet`() {
        val shelter = shelter(id = 10, persons = 10, needs = setOf(fruit))

        val shares = calculate(householdPersons = 0, collection(route1, items = emptyList(), shelters = setOf(shelter)))

        assertThat(shares.routes.single().shelters.single().items).isEmpty()
        assertThat(shares.totalBoxes).isZero()
    }

    private fun calculate(householdPersons: Int, vararg collections: FoodCollectionEntity): ShelterSharesResponse {
        val distribution = mockk<DistributionEntity>()
        every { distribution.countRegisteredPersons() } returns householdPersons
        every { distribution.foodCollections } returns collections.toList()
        return service.calculate(distribution)
    }

    private fun sharesOf(shares: ShelterSharesResponse, shelterId: Long) = shares.routes
        .flatMap { it.shelters }
        .single { it.shelterId == shelterId }
        .items

    private fun collection(route: RouteEntity, items: List<FoodCollectionItemEntity>, shelters: Set<ShelterEntity>) = FoodCollectionEntity(distribution = mockk(relaxed = true), route = route).apply {
        this.items = items
        this.shelters = shelters.toMutableSet()
    }

    private fun item(category: FoodCategoryEntity, amount: Int, shop: ShopEntity = boxShop) = FoodCollectionItemEntity(shop = shop, category = category, amount = amount)

    private fun shelter(id: Long, persons: Int, needs: Set<FoodCategoryEntity>, kitchen: Boolean? = false) = ShelterEntity(
        name = "Notschlafstelle $id",
        addressStreet = "Gasse",
        addressHouseNumber = "1",
        addressPostalCode = 1030,
        addressCity = "Wien",
        personsCount = persons,
        sortOrder = id.toInt(),
    ).apply {
        this.id = id
        hasKitchen = kitchen
        foodCategories = needs.toMutableSet()
    }
}
