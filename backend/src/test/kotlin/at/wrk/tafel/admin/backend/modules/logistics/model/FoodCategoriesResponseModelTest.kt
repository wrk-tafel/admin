package at.wrk.tafel.admin.backend.modules.logistics.model

import at.wrk.tafel.admin.backend.common.validation.BeanValidationTestSupport.validator
import org.assertj.core.api.Assertions.assertThat
import org.junit.jupiter.api.Test
import java.math.BigDecimal

class FoodCategoriesResponseModelTest {

    @Test
    fun `food category with blank name and negative weight is invalid`() {
        val category = FoodCategory(
            id = null,
            name = "",
            weightPerUnit = BigDecimal(-1),
            returnItem = false,
            sortOrder = 0,
            enabled = true,
        )

        val violations = validator.validate(category)

        assertThat(violations).extracting<String> { it.propertyPath.toString() }
            .containsExactlyInAnyOrder("name", "weightPerUnit")
    }

    @Test
    fun `food category with valid values is valid`() {
        val category = FoodCategory(
            id = null,
            name = "Category",
            weightPerUnit = BigDecimal.ZERO,
            returnItem = false,
            sortOrder = 0,
            enabled = true,
        )

        val violations = validator.validate(category)

        assertThat(violations).isEmpty()
    }

    @Test
    fun `food category reorder request with empty ids is invalid`() {
        val request = FoodCategoryReorderRequest(categoryIds = emptyList())

        val violations = validator.validate(request)

        assertThat(violations).extracting<String> { it.propertyPath.toString() }
            .containsExactly("categoryIds")
    }
}
