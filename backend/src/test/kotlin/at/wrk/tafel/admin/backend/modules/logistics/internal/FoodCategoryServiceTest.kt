package at.wrk.tafel.admin.backend.modules.logistics.internal

import at.wrk.tafel.admin.backend.database.model.logistics.FoodCategoryEntity
import at.wrk.tafel.admin.backend.database.model.logistics.FoodCategoryRepository
import at.wrk.tafel.admin.backend.modules.base.exception.NotFoundException
import at.wrk.tafel.admin.backend.modules.logistics.model.FoodCategoryRequest
import at.wrk.tafel.admin.backend.modules.logistics.model.FoodCategoryResponse
import at.wrk.tafel.admin.backend.modules.logistics.testFoodCategory1
import at.wrk.tafel.admin.backend.modules.logistics.testFoodCategory2
import at.wrk.tafel.admin.backend.modules.logistics.testFoodCategory3
import io.mockk.every
import io.mockk.impl.annotations.InjectMockKs
import io.mockk.impl.annotations.RelaxedMockK
import io.mockk.junit5.MockKExtension
import io.mockk.verify
import org.assertj.core.api.Assertions.assertThat
import org.junit.jupiter.api.Test
import org.junit.jupiter.api.assertThrows
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
                FoodCategoryResponse(
                    id = category3.id,
                    name = category3.name!!,
                    weightPerUnit = category3.weightPerUnit,
                    returnItem = category3.returnItem!!,
                    sortOrder = category3.sortOrder!!,
                    enabled = category3.enabled!!,
                ),
                FoodCategoryResponse(
                    id = category1.id,
                    name = category1.name!!,
                    weightPerUnit = category1.weightPerUnit,
                    returnItem = category1.returnItem!!,
                    sortOrder = category1.sortOrder!!,
                    enabled = category1.enabled!!,
                ),
                FoodCategoryResponse(
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
        val category3 = testFoodCategory3
        every { foodCategoryRepository.findAll() } returns listOf(category1, category3)

        val categories = service.getAllFoodCategories()

        assertThat(categories.map { it.id }).containsExactly(category3.id, category1.id)
    }

    @Test
    fun `get all categories excludes return-item categories`() {
        // testFoodCategory2 is a return-item ("Kisten") fixture
        every { foodCategoryRepository.findAll() } returns listOf(testFoodCategory1, testFoodCategory2)

        val categories = service.getAllFoodCategories()

        assertThat(categories.map { it.id }).containsExactly(testFoodCategory1.id)
    }

    @Test
    fun `create category assigns next sort order after the current max, ignoring the input value`() {
        val createInput = FoodCategoryRequest(
            id = null,
            name = "New Category",
            weightPerUnit = BigDecimal("15"),
            returnItem = false,
            sortOrder = 999,
            enabled = true,
        )

        every { foodCategoryRepository.findAll() } returns listOf(testFoodCategory1, testFoodCategory3, testFoodCategory2)
        every { foodCategoryRepository.save(any()) } answers {
            val arg = firstArg() as FoodCategoryEntity
            arg.id = 42
            arg
        }

        val result = service.createFoodCategory(createInput)

        // testFoodCategory2 is a return-item ("Kisten") fixture and must be ignored when
        // computing the next order - only testFoodCategory1 (sortOrder 200) and
        // testFoodCategory3 (sortOrder 100) count, so the next value is 201.
        assertThat(result).isEqualTo(
            FoodCategoryResponse(
                id = 42L,
                name = createInput.name,
                weightPerUnit = createInput.weightPerUnit,
                returnItem = createInput.returnItem,
                sortOrder = 201,
                enabled = createInput.enabled,
            ),
        )

        verify { foodCategoryRepository.save(any()) }
    }

    @Test
    fun `create category assigns sort order 1 when no categories exist yet`() {
        val createInput = FoodCategoryRequest(
            id = null,
            name = "New Category",
            weightPerUnit = BigDecimal("15"),
            returnItem = false,
            sortOrder = 999,
            enabled = true,
        )

        every { foodCategoryRepository.findAll() } returns emptyList()
        every { foodCategoryRepository.save(any()) } answers {
            val arg = firstArg() as FoodCategoryEntity
            arg.id = 42
            arg
        }

        val result = service.createFoodCategory(createInput)

        assertThat(result.sortOrder).isEqualTo(1)
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
        val updated = FoodCategoryRequest(
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

        assertThat(result).isEqualTo(
            FoodCategoryResponse(
                id = updated.id,
                name = updated.name,
                weightPerUnit = updated.weightPerUnit,
                returnItem = updated.returnItem,
                sortOrder = updated.sortOrder,
                enabled = updated.enabled,
            ),
        )
    }

    @Test
    fun `update category throws exception when not found`() {
        every { foodCategoryRepository.findByIdOrNull(99L) } returns null

        val updated = FoodCategoryRequest(
            id = 99L,
            name = "Updated Category",
            weightPerUnit = BigDecimal("99"),
            returnItem = true,
            sortOrder = 5,
            enabled = false,
        )

        val exception = assertThrows<NotFoundException> { service.updateFoodCategory(99L, updated) }
        assertThat(exception.body.detail).isEqualTo("FoodCategory with id 99 not found")
    }

    @Test
    fun `reorder categories assigns sequential sort order matching the given order`() {
        val entity1 = FoodCategoryEntity().apply {
            id = 1
            sortOrder = 200
        }
        val entity2 = FoodCategoryEntity().apply {
            id = 2
            sortOrder = 100
        }
        val entity3 = FoodCategoryEntity().apply {
            id = 3
            sortOrder = 300
        }

        every { foodCategoryRepository.findByIdOrNull(3L) } returns entity3
        every { foodCategoryRepository.findByIdOrNull(1L) } returns entity1
        every { foodCategoryRepository.findByIdOrNull(2L) } returns entity2
        every { foodCategoryRepository.save(any()) } answers { firstArg() as FoodCategoryEntity }

        service.reorderFoodCategories(listOf(3L, 1L, 2L))

        assertThat(entity3.sortOrder).isEqualTo(1)
        assertThat(entity1.sortOrder).isEqualTo(2)
        assertThat(entity2.sortOrder).isEqualTo(3)
        verify(exactly = 3) { foodCategoryRepository.save(any()) }
    }

    @Test
    fun `reorder categories throws exception when a category is not found`() {
        every { foodCategoryRepository.findByIdOrNull(99L) } returns null

        val exception = assertThrows<NotFoundException> { service.reorderFoodCategories(listOf(99L)) }
        assertThat(exception.body.detail).isEqualTo("FoodCategory with id 99 not found")
    }
}
