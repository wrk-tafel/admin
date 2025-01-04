package at.wrk.tafel.admin.backend.database.model.logistics

import org.assertj.core.api.Assertions.assertThat
import org.junit.jupiter.api.Test
import java.math.BigDecimal

class FoodCollectionItemEntityTest {

    @Test
    fun `calculate weight with unit KG`() {
        val entity = FoodCollectionItemEntity().apply {
            amount = 5
            shop = ShopEntity().apply {
                foodUnit = FoodUnit.KG
            }
        }

        val weight = entity.calculateWeight()

        assertThat(weight).isEqualTo(BigDecimal(5))
    }

    @Test
    fun `calculate weight with unit BOX`() {
        val entity = FoodCollectionItemEntity().apply {
            amount = 5
            shop = ShopEntity().apply {
                foodUnit = FoodUnit.BOX
            }
            category = FoodCategoryEntity().apply {
                weightPerUnit = BigDecimal(0.5)
            }
        }

        val weight = entity.calculateWeight()

        assertThat(weight).isEqualTo(BigDecimal(2.5))
    }

}
