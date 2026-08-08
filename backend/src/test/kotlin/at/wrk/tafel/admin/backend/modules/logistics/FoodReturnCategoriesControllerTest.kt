package at.wrk.tafel.admin.backend.modules.logistics

import at.wrk.tafel.admin.backend.modules.logistics.internal.FoodReturnCategoryService
import at.wrk.tafel.admin.backend.modules.logistics.model.FoodReturnCategoryReorderRequest
import at.wrk.tafel.admin.backend.modules.logistics.model.FoodReturnCategoryRequest
import at.wrk.tafel.admin.backend.modules.logistics.model.FoodReturnCategoryResponse
import io.mockk.every
import io.mockk.impl.annotations.InjectMockKs
import io.mockk.impl.annotations.RelaxedMockK
import io.mockk.junit5.MockKExtension
import io.mockk.verify
import org.assertj.core.api.Assertions.assertThat
import org.junit.jupiter.api.Test
import org.junit.jupiter.api.extension.ExtendWith
import org.springframework.http.HttpStatus

@ExtendWith(MockKExtension::class)
class FoodReturnCategoriesControllerTest {

    @RelaxedMockK
    private lateinit var service: FoodReturnCategoryService

    @InjectMockKs
    private lateinit var controller: FoodReturnCategoriesController

    private val testCategory = FoodReturnCategoryResponse(
        id = 11,
        name = "Graue Kisten",
        sortOrder = 1,
        enabled = true,
    )

    @Test
    fun `get active categories`() {
        every { service.getActiveFoodReturnCategories() } returns listOf(testCategory)

        val response = controller.getActiveFoodReturnCategories()

        assertThat(response.categories).containsExactly(testCategory)
    }

    @Test
    fun `get all categories`() {
        every { service.getAllFoodReturnCategories() } returns listOf(testCategory)

        val response = controller.getAllFoodReturnCategories()

        assertThat(response.categories).containsExactly(testCategory)
    }

    @Test
    fun `create category returns 201`() {
        val request = FoodReturnCategoryRequest(id = null, name = "Graue Kisten", sortOrder = 0, enabled = true)
        every { service.createFoodReturnCategory(request) } returns testCategory

        val response = controller.createFoodReturnCategory(request)

        assertThat(response.statusCode).isEqualTo(HttpStatus.CREATED)
        assertThat(response.body).isEqualTo(testCategory)
    }

    @Test
    fun `update category`() {
        val request = FoodReturnCategoryRequest(id = 11, name = "Graue Kisten", sortOrder = 1, enabled = true)
        every { service.updateFoodReturnCategory(11L, request) } returns testCategory

        val response = controller.updateFoodReturnCategory(11L, request)

        assertThat(response).isEqualTo(testCategory)
    }

    @Test
    fun `reorder categories returns the reordered list`() {
        val request = FoodReturnCategoryReorderRequest(categoryIds = listOf(12L, 11L))
        every { service.getAllFoodReturnCategories() } returns listOf(testCategory)

        val response = controller.reorderFoodReturnCategories(request)

        verify(exactly = 1) { service.reorderFoodReturnCategories(listOf(12L, 11L)) }
        assertThat(response.categories).containsExactly(testCategory)
    }
}
