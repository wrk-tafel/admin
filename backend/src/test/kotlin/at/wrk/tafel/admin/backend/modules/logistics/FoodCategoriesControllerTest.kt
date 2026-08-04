package at.wrk.tafel.admin.backend.modules.logistics

import at.wrk.tafel.admin.backend.modules.logistics.internal.FoodCategoryService
import at.wrk.tafel.admin.backend.modules.logistics.model.FoodCategoriesListResponse
import at.wrk.tafel.admin.backend.modules.logistics.model.FoodCategoryReorderRequest
import at.wrk.tafel.admin.backend.modules.logistics.model.FoodCategoryRequest
import at.wrk.tafel.admin.backend.modules.logistics.model.FoodCategoryResponse
import io.mockk.every
import io.mockk.impl.annotations.InjectMockKs
import io.mockk.impl.annotations.RelaxedMockK
import io.mockk.junit5.MockKExtension
import io.mockk.verify
import org.assertj.core.api.Assertions.assertThat
import org.junit.jupiter.api.Test
import org.junit.jupiter.api.extension.ExtendWith
import org.springframework.http.HttpStatus
import java.math.BigDecimal

@ExtendWith(MockKExtension::class)
class FoodCategoriesControllerTest {

    @RelaxedMockK
    private lateinit var foodCategoriesService: FoodCategoryService

    @InjectMockKs
    private lateinit var controller: FoodCategoriesController

    @Test
    fun `get active categories`() {
        val category1 = testCategoryResponse(1)
        val category2 = testCategoryResponse(2)
        every { foodCategoriesService.getActiveFoodCategories() } returns listOf(category1, category2)

        val categoriesListResponse = controller.getActiveFoodCategories()

        assertThat(categoriesListResponse).isEqualTo(
            FoodCategoriesListResponse(categories = listOf(category1, category2)),
        )
    }

    @Test
    fun `get all categories`() {
        val category1 = testCategoryResponse(1)
        val category2 = testCategoryResponse(2)
        every { foodCategoriesService.getAllFoodCategories() } returns listOf(category1, category2)

        val categoriesListResponse = controller.getAllFoodCategories()

        assertThat(categoriesListResponse).isEqualTo(
            FoodCategoriesListResponse(categories = listOf(category1, category2)),
        )
    }

    @Test
    fun `create category`() {
        val newCategory = testCategoryRequest(null)
        val createdCategory = testCategoryResponse(42)

        every { foodCategoriesService.createFoodCategory(any()) } returns createdCategory

        val response = controller.createFoodCategory(newCategory)

        assertThat(response.statusCode).isEqualTo(HttpStatus.CREATED)
        assertThat(response.body).isEqualTo(createdCategory)
        verify { foodCategoriesService.createFoodCategory(newCategory) }
    }

    @Test
    fun `update category`() {
        val updatedRequest = testCategoryRequest(1)
        val updatedResponse = testCategoryResponse(1)

        every { foodCategoriesService.updateFoodCategory(any(), any()) } returns updatedResponse

        val response = controller.updateFoodCategory(1L, updatedRequest)

        assertThat(response).isEqualTo(updatedResponse)
        verify { foodCategoriesService.updateFoodCategory(1L, updatedRequest) }
    }

    @Test
    fun `reorder categories`() {
        val category1 = testCategoryResponse(1)
        val category2 = testCategoryResponse(2)
        val request = FoodCategoryReorderRequest(categoryIds = listOf(2L, 1L))

        every { foodCategoriesService.reorderFoodCategories(request.categoryIds) } returns Unit
        every { foodCategoriesService.getAllFoodCategories() } returns listOf(category2, category1)

        val response = controller.reorderFoodCategories(request)

        assertThat(response).isEqualTo(
            FoodCategoriesListResponse(categories = listOf(category2, category1)),
        )
        verify { foodCategoriesService.reorderFoodCategories(request.categoryIds) }
    }

    private fun testCategoryRequest(id: Long?) = FoodCategoryRequest(
        id = id,
        name = "Category $id",
        weightPerUnit = BigDecimal.TEN,
        returnItem = false,
        sortOrder = 10,
        enabled = true,
    )

    private fun testCategoryResponse(id: Long?) = FoodCategoryResponse(
        id = id,
        name = "Category $id",
        weightPerUnit = BigDecimal.TEN,
        returnItem = false,
        sortOrder = 10,
        enabled = true,
    )
}
