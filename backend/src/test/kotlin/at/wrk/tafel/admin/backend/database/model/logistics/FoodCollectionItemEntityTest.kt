package at.wrk.tafel.admin.backend.database.model.logistics

import org.assertj.core.api.Assertions.assertThat
import org.junit.jupiter.api.Test
import java.math.BigDecimal

class FoodCollectionItemEntityTest {

    @Test
    fun `calculate weight with unit KG`() {
        val shop = ShopEntity(
            number = 1,
            name = "Shop",
            address = ShopAddress(postalCode = 1234, street = "Street", city = "City"),
            foodUnit = FoodUnit.KG,
        )
        val category = FoodCategoryEntity(name = "Category", sortOrder = 1)
        val entity = FoodCollectionItemEntity(shop = shop, category = category, amount = 5)

        val weight = entity.calculateWeight()

        assertThat(weight).isEqualTo(BigDecimal(5))
    }

    @Test
    fun `calculate weight with unit BOX`() {
        val shop = ShopEntity(
            number = 1,
            name = "Shop",
            address = ShopAddress(postalCode = 1234, street = "Street", city = "City"),
            foodUnit = FoodUnit.BOX,
        )
        val category = FoodCategoryEntity(name = "Category", sortOrder = 1).apply {
            weightPerUnit = BigDecimal(0.5)
        }
        val entity = FoodCollectionItemEntity(shop = shop, category = category, amount = 5)

        val weight = entity.calculateWeight()

        assertThat(weight).isEqualTo(BigDecimal(2.5))
    }
}
