package at.wrk.tafel.admin.backend.database.model.logistics

import org.assertj.core.api.Assertions.assertThat
import org.junit.jupiter.api.Test
import java.math.BigDecimal

class FoodCollectionItemEntityTest {

    private fun shop(foodUnit: FoodUnit) = ShopEntity(
        number = 1,
        name = "Shop",
        address = ShopAddress(postalCode = 1234, street = "Street", city = "City"),
        foodUnit = foodUnit,
    )

    private fun category(weightPerUnit: BigDecimal? = null) = FoodCategoryEntity(name = "Category", sortOrder = 1)
        .apply { this.weightPerUnit = weightPerUnit }

    @Test
    fun `weight with unit KG`() {
        val entity = FoodCollectionItemEntity(shop = shop(FoodUnit.KG), category = category(), amount = 5)

        assertThat(entity.weight).isEqualTo(BigDecimal(5))
    }

    @Test
    fun `weight with unit BOX`() {
        val entity = FoodCollectionItemEntity(
            shop = shop(FoodUnit.BOX),
            category = category(BigDecimal(0.5)),
            amount = 5,
        )

        assertThat(entity.weight).isEqualTo(BigDecimal(2.5))
    }

    @Test
    fun `weight with unit BOX and category without weight per unit`() {
        val entity = FoodCollectionItemEntity(shop = shop(FoodUnit.BOX), category = category(), amount = 5)

        assertThat(entity.weight).isEqualTo(BigDecimal.ZERO)
    }

    @Test
    fun `updateAmount recalculates the weight`() {
        val entity = FoodCollectionItemEntity(
            shop = shop(FoodUnit.BOX),
            category = category(BigDecimal(2)),
            amount = 5,
        )

        entity.updateAmount(7)

        assertThat(entity.amount).isEqualTo(7)
        assertThat(entity.weight).isEqualTo(BigDecimal(14))
    }

    @Test
    fun `weight stays at the recorded value when the master data changes afterwards`() {
        val category = category(BigDecimal(2))
        val entity = FoodCollectionItemEntity(shop = shop(FoodUnit.BOX), category = category, amount = 5)

        category.weightPerUnit = BigDecimal(10)

        assertThat(entity.weight).isEqualTo(BigDecimal(10))
    }
}
