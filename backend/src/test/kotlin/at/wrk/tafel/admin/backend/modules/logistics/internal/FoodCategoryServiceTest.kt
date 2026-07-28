package at.wrk.tafel.admin.backend.modules.logistics.internal

import at.wrk.tafel.admin.backend.database.model.logistics.FoodCategoryEntity
import at.wrk.tafel.admin.backend.database.model.logistics.FoodCategoryRepository
import at.wrk.tafel.admin.backend.modules.base.exception.TafelValidationException
import at.wrk.tafel.admin.backend.modules.logistics.model.FoodCategory
import at.wrk.tafel.admin.backend.modules.logistics.testFoodCategory1
import at.wrk.tafel.admin.backend.modules.logistics.testFoodCategory2
import at.wrk.tafel.admin.backend.modules.logistics.testFoodCategory3
import io.mockk.every
import io.mockk.impl.annotations.InjectMockKs
import io.mockk.impl.annotations.RelaxedMockK
import io.mockk.junit5.MockKExtension
import io.mockk.verify
import org.assertj.core.api.Assertions.assertThat
import org.assertj.core.api.Assertions.assertThatThrownBy
import org.junit.jupiter.api.Test
import org.junit.jupiter.api.extension.ExtendWith
import org.springframework.data.repository.findByIdOrNull
import java.math.BigDecimal

@ExtendWith(MockKExtension::class)
class FoodCategoryServiceTest {

    @RelaxedMockK
    private lateinit var foodCategoryRepository: FoodCategoryRepository

    @InjectMockKs
    private lateinit var service: FoodCategoryService

    @Test
    fun `get active categories`() {
        val category1 = testFoodCategory1
        val category2 = testFoodCategory2
        val category3 = testFoodCategory3
        every { foodCategoryRepository.findByEnabledIsTrue() } returns listOf(category1, category2, category3)

        val categories = service.getActiveFoodCategories()

        assertThat(categories).isEqualTo(
            listOf(
                FoodCategory(
                    id = category3.id,
                    name = category3.name!!,
                    weightPerUnit = category3.weightPerUnit,
                    returnItem = category3.returnItem!!,
                    sortOrder = category3.sortOrder!!,
                    enabled = category3.enabled!!,
                ),
                FoodCategory(
                    id = category1.id,
                    name = category1.name!!,
                    weightPerUnit = category1.weightPerUnit,
                    returnItem = category1.returnItem!!,
                    sortOrder = category1.sortOrder!!,
                    enabled = category1.enabled!!,
                ),
                FoodCategory(
                    id = category2.id,
                    name = category2.name!!,
                    weightPerUnit = category2.weightPerUnit,
                    returnItem = category2.returnItem!!,
                    sortOrder = 0,
                    enabled = category2.enabled!!,
                ),
            ),
        )
    }

    @Test
    fun `get all categories`() {
        val category1 = testFoodCategory1
        val category2 = testFoodCategory2
        val category3 = testFoodCategory3
        every { foodCategoryRepository.findAll() } returns listOf(category1, category2, category3)

        val categories = service.getAllFoodCategories()

        assertThat(categories.map { it.id }).containsExactly(category3.id, category1.id, category2.id)
    }

    @Test
    fun `create category`() {
        val createInput = FoodCategory(
            id = null,
            name = "New Category",
            weightPerUnit = BigDecimal("15"),
            returnItem = false,
            sortOrder = 50,
            enabled = true,
        )

        every { foodCategoryRepository.save(any()) } answers {
            val arg = firstArg() as FoodCategoryEntity
            arg.id = 42
            arg
        }

        val result = service.createFoodCategory(createInput)

        assertThat(result).isEqualTo(createInput.copy(id = 42L))

        verify { foodCategoryRepository.save(any()) }
    }

    @Test
    fun `update category`() {
        val existingEntity = FoodCategoryEntity().apply {
            id = 3
            name = "Category 3"
            weightPerUnit = BigDecimal("30")
            returnItem = false
            sortOrder = 100
            enabled = true
        }
        val updated = FoodCategory(
            id = existingEntity.id,
            name = "Updated Category",
            weightPerUnit = BigDecimal("99"),
            returnItem = true,
            sortOrder = 5,
            enabled = false,
        )

        every { foodCategoryRepository.findByIdOrNull(existingEntity.id!!) } returns existingEntity
        every { foodCategoryRepository.save(any()) } answers { firstArg() as FoodCategoryEntity }

        val result = service.updateFoodCategory(existingEntity.id!!, updated)

        assertThat(result).isEqualTo(updated)
    }

    @Test
    fun `update category throws exception when not found`() {
        every { foodCategoryRepository.findByIdOrNull(99L) } returns null

        val updated = FoodCategory(
            id = 99L,
            name = "Updated Category",
            weightPerUnit = BigDecimal("99"),
            returnItem = true,
            sortOrder = 5,
            enabled = false,
        )

        assertThatThrownBy { service.updateFoodCategory(99L, updated) }
            .isInstanceOf(TafelValidationException::class.java)
            .hasMessage("FoodCategory with id 99 not found")
    }
}
