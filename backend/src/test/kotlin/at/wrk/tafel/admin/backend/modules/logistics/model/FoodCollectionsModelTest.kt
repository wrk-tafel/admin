package at.wrk.tafel.admin.backend.modules.logistics.model

import at.wrk.tafel.admin.backend.common.validation.BeanValidationTestSupport.validator
import org.assertj.core.api.Assertions.assertThat
import org.junit.jupiter.api.Test

class FoodCollectionsModelTest {

    @Test
    fun `save route data with non-positive values is invalid`() {
        val data = FoodCollectionSaveRouteRequest(carId = 0, driverId = 0, coDriverId = 0)

        val violations = validator.validate(data)

        assertThat(violations).extracting<String> { it.propertyPath.toString() }
            .containsExactlyInAnyOrder("carId", "driverId", "coDriverId")
    }

    @Test
    fun `save route data with valid values is valid`() {
        val data = FoodCollectionSaveRouteRequest(carId = 1, driverId = 1, coDriverId = 2)

        val violations = validator.validate(data)

        assertThat(violations).isEmpty()
    }

    @Test
    fun `save km with negative values is invalid`() {
        val data = FoodCollectionSaveKmRequest(kmStart = -1, kmEnd = -1)

        val violations = validator.validate(data)

        assertThat(violations).extracting<String> { it.propertyPath.toString() }
            .containsExactlyInAnyOrder("kmStart", "kmEnd")
    }

    @Test
    fun `save km with valid values is valid`() {
        val data = FoodCollectionSaveKmRequest(kmStart = 1000, kmEnd = 2000)

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

    @Test
    fun `return item with non-positive shop, blank description and negative amount is invalid`() {
        val returnItem = FoodCollectionReturnItem(shopId = 0, description = " ", amount = -1)

        val violations = validator.validate(returnItem)

        assertThat(violations).extracting<String> { it.propertyPath.toString() }
            .containsExactlyInAnyOrder("shopId", "description", "amount")
    }

    @Test
    fun `return item with a too long description is invalid`() {
        val returnItem = FoodCollectionReturnItem(shopId = 1, description = "x".repeat(101), amount = 1)

        val violations = validator.validate(returnItem)

        assertThat(violations).extracting<String> { it.propertyPath.toString() }
            .containsExactly("description")
    }

    @Test
    fun `save return items cascades into invalid return item`() {
        val data = FoodCollectionSaveReturnItemsRequest(
            returnItems = listOf(FoodCollectionReturnItem(shopId = 1, description = "", amount = 1)),
        )

        val violations = validator.validate(data)

        assertThat(violations).extracting<String> { it.propertyPath.toString() }
            .containsExactly("returnItems[0].description")
    }

    @Test
    fun `save return items per shop with an empty list is valid`() {
        val data = FoodCollectionSaveReturnItemsPerShopRequest(returnItems = emptyList())

        val violations = validator.validate(data)

        assertThat(violations).isEmpty()
    }

    @Test
    fun `save return items per shop cascades into invalid return item`() {
        val data = FoodCollectionSaveReturnItemsPerShopRequest(
            returnItems = listOf(FoodCollectionReturnItemAmount(description = "Kiste", amount = -1)),
        )

        val violations = validator.validate(data)

        assertThat(violations).extracting<String> { it.propertyPath.toString() }
            .containsExactly("returnItems[0].amount")
    }
}
