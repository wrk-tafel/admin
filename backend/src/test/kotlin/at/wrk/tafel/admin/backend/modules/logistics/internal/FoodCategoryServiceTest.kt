package at.wrk.tafel.admin.backend.modules.logistics.internal

import at.wrk.tafel.admin.backend.database.model.logistics.FoodCategoryRepository
import at.wrk.tafel.admin.backend.modules.logistics.model.FoodCategory
import at.wrk.tafel.admin.backend.modules.logistics.testFoodCategory1
import at.wrk.tafel.admin.backend.modules.logistics.testFoodCategory2
import at.wrk.tafel.admin.backend.modules.logistics.testFoodCategory3
import io.mockk.every
import io.mockk.impl.annotations.InjectMockKs
import io.mockk.impl.annotations.RelaxedMockK
import io.mockk.junit5.MockKExtension
import org.assertj.core.api.Assertions.assertThat
import org.junit.jupiter.api.Test
import org.junit.jupiter.api.extension.ExtendWith

@ExtendWith(MockKExtension::class)
class FoodCategoryServiceTest {

    @RelaxedMockK
    private lateinit var foodCategoryRepository: FoodCategoryRepository

    @InjectMockKs
    private lateinit var service: FoodCategoryService

    @Test
    fun `get categories`() {
        val category1 = testFoodCategory1
        val category2 = testFoodCategory2
        val category3 = testFoodCategory3
        every { foodCategoryRepository.findAll() } returns listOf(category1, category2, category3)

        val categories = service.getFoodCategories()

        assertThat(categories).isEqualTo(
            listOf(
                FoodCategory(
                    id = category3.id!!,
                    name = category3.name!!,
                    returnItem = category3.returnItem!!
                ),
                FoodCategory(
                    id = category1.id!!,
                    name = category1.name!!,
                    returnItem = category1.returnItem!!
                ),
                FoodCategory(
                    id = category2.id!!,
                    name = category2.name!!,
                    returnItem = category2.returnItem!!
                )
            )
        )
    }

}
