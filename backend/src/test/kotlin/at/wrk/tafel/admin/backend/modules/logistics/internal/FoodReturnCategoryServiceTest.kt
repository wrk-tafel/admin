package at.wrk.tafel.admin.backend.modules.logistics.internal

import at.wrk.tafel.admin.backend.database.model.logistics.FoodReturnCategoryEntity
import at.wrk.tafel.admin.backend.database.model.logistics.FoodReturnCategoryRepository
import at.wrk.tafel.admin.backend.modules.base.exception.NotFoundException
import at.wrk.tafel.admin.backend.modules.logistics.model.FoodReturnCategoryRequest
import at.wrk.tafel.admin.backend.modules.logistics.model.FoodReturnCategoryResponse
import at.wrk.tafel.admin.backend.modules.logistics.testFoodReturnCategory1
import at.wrk.tafel.admin.backend.modules.logistics.testFoodReturnCategory2
import at.wrk.tafel.admin.backend.modules.logistics.testFoodReturnCategory3
import io.mockk.every
import io.mockk.impl.annotations.InjectMockKs
import io.mockk.impl.annotations.RelaxedMockK
import io.mockk.junit5.MockKExtension
import io.mockk.slot
import io.mockk.verify
import org.assertj.core.api.Assertions.assertThat
import org.junit.jupiter.api.Test
import org.junit.jupiter.api.assertThrows
import org.junit.jupiter.api.extension.ExtendWith
import org.springframework.data.repository.findByIdOrNull

@ExtendWith(MockKExtension::class)
class FoodReturnCategoryServiceTest {

    @RelaxedMockK
    private lateinit var foodReturnCategoryRepository: FoodReturnCategoryRepository

    @InjectMockKs
    private lateinit var service: FoodReturnCategoryService

    @Test
    fun `get active categories sorted by sort order`() {
        every { foodReturnCategoryRepository.findByEnabledIsTrue() } returns listOf(
            testFoodReturnCategory1,
            testFoodReturnCategory2,
        )

        val categories = service.getActiveFoodReturnCategories()

        assertThat(categories).isEqualTo(
            listOf(
                FoodReturnCategoryResponse(
                    id = testFoodReturnCategory2.id,
                    name = testFoodReturnCategory2.name,
                    sortOrder = testFoodReturnCategory2.sortOrder,
                    enabled = testFoodReturnCategory2.enabled,
                ),
                FoodReturnCategoryResponse(
                    id = testFoodReturnCategory1.id,
                    name = testFoodReturnCategory1.name,
                    sortOrder = testFoodReturnCategory1.sortOrder,
                    enabled = testFoodReturnCategory1.enabled,
                ),
            ),
        )
    }

    @Test
    fun `get all categories includes the disabled ones`() {
        every { foodReturnCategoryRepository.findAll() } returns listOf(
            testFoodReturnCategory1,
            testFoodReturnCategory2,
            testFoodReturnCategory3,
        )

        val categories = service.getAllFoodReturnCategories()

        assertThat(categories).extracting<String> { it.name }
            .containsExactly("Klappkisten schwarz", "Graue Kisten", "Ströck Kisten")
        assertThat(categories.last().enabled).isFalse()
    }

    @Test
    fun `create appends the category at the end`() {
        every { foodReturnCategoryRepository.findAll() } returns listOf(
            testFoodReturnCategory1,
            testFoodReturnCategory2,
            testFoodReturnCategory3,
        )
        every { foodReturnCategoryRepository.save(any()) } answers { firstArg() }

        val created = service.createFoodReturnCategory(
            FoodReturnCategoryRequest(id = null, name = "Bananenkisten", sortOrder = 0, enabled = true),
        )

        assertThat(created.name).isEqualTo("Bananenkisten")
        // highest existing sortOrder is 3
        assertThat(created.sortOrder).isEqualTo(4)
    }

    @Test
    fun `create with no existing categories starts at 1`() {
        every { foodReturnCategoryRepository.findAll() } returns emptyList()
        every { foodReturnCategoryRepository.save(any()) } answers { firstArg() }

        val created = service.createFoodReturnCategory(
            FoodReturnCategoryRequest(id = null, name = "Bananenkisten", sortOrder = 0, enabled = true),
        )

        assertThat(created.sortOrder).isEqualTo(1)
    }

    @Test
    fun `update changes name, sort order and enabled`() {
        val entity = FoodReturnCategoryEntity(name = "Alt", sortOrder = 1, enabled = true).apply { id = 55 }
        every { foodReturnCategoryRepository.findByIdOrNull(55L) } returns entity
        every { foodReturnCategoryRepository.save(any()) } answers { firstArg() }

        val updated = service.updateFoodReturnCategory(
            55L,
            FoodReturnCategoryRequest(id = 55, name = "Neu", sortOrder = 7, enabled = false),
        )

        assertThat(updated).isEqualTo(
            FoodReturnCategoryResponse(id = 55, name = "Neu", sortOrder = 7, enabled = false),
        )
    }

    @Test
    fun `update with unknown id throws`() {
        every { foodReturnCategoryRepository.findByIdOrNull(999L) } returns null

        val exception = assertThrows<NotFoundException> {
            service.updateFoodReturnCategory(
                999L,
                FoodReturnCategoryRequest(id = 999, name = "Neu", sortOrder = 1, enabled = true),
            )
        }
        assertThat(exception.body.detail).isEqualTo("FoodReturnCategory with id 999 not found")
    }

    @Test
    fun `reorder renumbers strictly by the order the client sent`() {
        val first = FoodReturnCategoryEntity(name = "A", sortOrder = 5, enabled = true).apply { id = 1 }
        val second = FoodReturnCategoryEntity(name = "B", sortOrder = 9, enabled = true).apply { id = 2 }
        every { foodReturnCategoryRepository.findByIdOrNull(1L) } returns first
        every { foodReturnCategoryRepository.findByIdOrNull(2L) } returns second
        every { foodReturnCategoryRepository.save(any()) } answers { firstArg() }

        service.reorderFoodReturnCategories(listOf(2L, 1L))

        val savedSlot = mutableListOf<FoodReturnCategoryEntity>()
        verify(exactly = 2) { foodReturnCategoryRepository.save(capture(savedSlot)) }
        assertThat(second.sortOrder).isEqualTo(1)
        assertThat(first.sortOrder).isEqualTo(2)
    }

    @Test
    fun `reorder with unknown id throws`() {
        every { foodReturnCategoryRepository.findByIdOrNull(999L) } returns null

        val exception = assertThrows<NotFoundException> { service.reorderFoodReturnCategories(listOf(999L)) }
        assertThat(exception.body.detail).isEqualTo("FoodReturnCategory with id 999 not found")
    }

    @Test
    fun `create logs the new category`() {
        every { foodReturnCategoryRepository.findAll() } returns emptyList()
        val savedSlot = slot<FoodReturnCategoryEntity>()
        every { foodReturnCategoryRepository.save(capture(savedSlot)) } answers { firstArg() }

        service.createFoodReturnCategory(
            FoodReturnCategoryRequest(id = null, name = "Bananenkisten", sortOrder = 0, enabled = true),
        )

        assertThat(savedSlot.captured.name).isEqualTo("Bananenkisten")
        assertThat(savedSlot.captured.enabled).isTrue()
    }
}
