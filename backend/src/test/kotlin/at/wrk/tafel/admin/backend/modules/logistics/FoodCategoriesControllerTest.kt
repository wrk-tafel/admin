package at.wrk.tafel.admin.backend.modules.logistics

import at.wrk.tafel.admin.backend.modules.logistics.internal.FoodCategoryService
import at.wrk.tafel.admin.backend.modules.logistics.model.FoodCategoriesListResponse
import at.wrk.tafel.admin.backend.modules.logistics.model.FoodCategory
import io.mockk.every
import io.mockk.impl.annotations.InjectMockKs
import io.mockk.impl.annotations.RelaxedMockK
import io.mockk.junit5.MockKExtension
import org.assertj.core.api.Assertions.assertThat
import org.junit.jupiter.api.Test
import org.junit.jupiter.api.extension.ExtendWith

@ExtendWith(MockKExtension::class)
class FoodCategoriesControllerTest {

    @RelaxedMockK
    private lateinit var foodCategoriesService: FoodCategoryService

    @InjectMockKs
    private lateinit var controller: FoodCategoriesController

    @Test
    fun `get categories`() {
        val category1 = FoodCategory(
            id = 1,
            name = "Category 1",
            returnItem = false,
        )
        val category2 = FoodCategory(
            id = 2,
            name = "Category 2",
            returnItem = true,
        )
        every { foodCategoriesService.getFoodCategories() } returns listOf(category1, category2)

        val categoriesListResponse = controller.getFoodCategories()

        assertThat(categoriesListResponse).isEqualTo(
            FoodCategoriesListResponse(
                categories = listOf(
                    category1,
                    category2
                )
            )
        )
    }

}
