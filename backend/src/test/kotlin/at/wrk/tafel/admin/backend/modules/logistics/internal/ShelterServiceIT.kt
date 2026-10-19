package at.wrk.tafel.admin.backend.modules.logistics.internal

import at.wrk.tafel.admin.backend.TafelBaseIntegrationTest
import at.wrk.tafel.admin.backend.database.model.logistics.FoodCategoryEntity
import at.wrk.tafel.admin.backend.modules.logistics.model.ShelterContactItem
import at.wrk.tafel.admin.backend.modules.logistics.model.ShelterRequest
import org.assertj.core.api.Assertions.assertThat
import org.junit.jupiter.api.Test
import org.springframework.beans.factory.annotation.Autowired
import org.springframework.boot.jpa.test.autoconfigure.TestEntityManager
import org.springframework.transaction.annotation.Transactional

@Transactional
class ShelterServiceIT : TafelBaseIntegrationTest() {

    @Autowired
    private lateinit var testEntityManager: TestEntityManager

    @Autowired
    private lateinit var shelterService: ShelterService

    @Test
    fun `create and update persist whether a shelter has a kitchen and the food categories it needs`() {
        val bread = persistFoodCategory("IT Brot", sortOrder = 2)
        val vegetables = persistFoodCategory("IT Gemüse", sortOrder = 1)
        val cans = persistFoodCategory("IT Konserven", sortOrder = 3)

        val created = shelterService.createShelter(
            shelterRequest(
                hasKitchen = true,
                foodCategoryIds = listOf(bread.id!!, vegetables.id!!),
                contacts = listOf(ShelterContactItem(firstname = "Anna", lastname = null, phone = "0664 1")),
            ),
        )
        testEntityManager.flush()
        testEntityManager.clear()

        val reloaded = shelterService.getAllShelters().single { it.id == created.id }
        assertThat(reloaded.hasKitchen).isTrue()
        assertThat(reloaded.foodCategoryIds).containsExactly(vegetables.id, bread.id)

        shelterService.updateShelter(
            created.id!!,
            shelterRequest(
                hasKitchen = false,
                foodCategoryIds = listOf(cans.id!!),
                contacts = listOf(ShelterContactItem(firstname = "Berta", lastname = null, phone = "0664 2")),
            ),
        )
        testEntityManager.flush()
        testEntityManager.clear()

        val updated = shelterService.getAllShelters().single { it.id == created.id }
        assertThat(updated.hasKitchen).isFalse()
        assertThat(updated.foodCategoryIds).containsExactly(cans.id)
        // the contacts are replaced inside the same transaction, which an orphan-removal collection
        // only allows when it is changed in place rather than swapped for a new instance
        assertThat(updated.contacts).extracting<String> { it.phone }.containsExactly("0664 2")
    }

    private fun persistFoodCategory(name: String, sortOrder: Int): FoodCategoryEntity =
        testEntityManager.persistAndFlush(FoodCategoryEntity(name = name, sortOrder = sortOrder))

    private fun shelterRequest(hasKitchen: Boolean, foodCategoryIds: List<Long>, contacts: List<ShelterContactItem>) = ShelterRequest(
        id = null,
        name = "IT Shelter",
        addressStreet = "Street",
        addressHouseNumber = "1",
        addressStairway = null,
        addressDoor = null,
        addressPostalCode = 1030,
        addressCity = "Wien",
        note = null,
        personsCount = 10,
        enabled = true,
        sortOrder = 0,
        contacts = contacts,
        hasKitchen = hasKitchen,
        foodCategoryIds = foodCategoryIds,
    )
}
