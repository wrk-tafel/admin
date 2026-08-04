package at.wrk.tafel.admin.backend.modules.logistics.model

import at.wrk.tafel.admin.backend.common.validation.BeanValidationTestSupport.validator
import org.assertj.core.api.Assertions.assertThat
import org.junit.jupiter.api.Test

class FoodCollectionsModelTest {

    @Test
    fun `save route data with non-positive and negative values is invalid`() {
        val data = FoodCollectionSaveRouteRequest(carId = 0, driverId = 0, coDriverId = 0, kmStart = -1, kmEnd = -1)

        val violations = validator.validate(data)

        assertThat(violations).extracting<String> { it.propertyPath.toString() }
            .containsExactlyInAnyOrder("carId", "driverId", "coDriverId", "kmStart", "kmEnd")
    }

    @Test
    fun `save route data with valid values is valid`() {
        val data = FoodCollectionSaveRouteRequest(carId = 1, driverId = 1, coDriverId = 2, kmStart = 0, kmEnd = 0)

        val violations = validator.validate(data)

        assertThat(violations).isEmpty()
    }

    @Test
    fun `food collection item with non-positive and negative values is invalid`() {
        val item = FoodCollectionItem(categoryId = 0, shopId = 0, amount = -1)

        val violations = validator.validate(item)

        assertThat(violations).extracting<String> { it.propertyPath.toString() }
            .containsExactlyInAnyOrder("categoryId", "shopId", "amount")
    }

    @Test
    fun `food collection items with empty list is invalid`() {
        val items = FoodCollectionItemsRequest(items = emptyList())

        val violations = validator.validate(items)

        assertThat(violations).extracting<String> { it.propertyPath.toString() }
            .containsExactly("items")
    }

    @Test
    fun `food collection items cascades into invalid item`() {
        val items = FoodCollectionItemsRequest(items = listOf(FoodCollectionItem(categoryId = 0, shopId = 1, amount = 1)))

        val violations = validator.validate(items)

        assertThat(violations).extracting<String> { it.propertyPath.toString() }
            .containsExactly("items[0].categoryId")
    }

    @Test
    fun `food collection category amount with non-positive and negative values is invalid`() {
        val item = FoodCollectionCategoryAmount(categoryId = 0, amount = -1)

        val violations = validator.validate(item)

        assertThat(violations).extracting<String> { it.propertyPath.toString() }
            .containsExactlyInAnyOrder("categoryId", "amount")
    }

    @Test
    fun `save items per shop data with empty list is invalid`() {
        val data = FoodCollectionSaveItemsPerShopRequest(items = emptyList())

        val violations = validator.validate(data)

        assertThat(violations).extracting<String> { it.propertyPath.toString() }
            .containsExactly("items")
    }
}
