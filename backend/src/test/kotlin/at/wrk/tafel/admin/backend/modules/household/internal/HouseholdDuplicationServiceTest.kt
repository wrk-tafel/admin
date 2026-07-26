package at.wrk.tafel.admin.backend.modules.household.internal

import at.wrk.tafel.admin.backend.database.model.household.HouseholdEntity
import at.wrk.tafel.admin.backend.database.model.household.HouseholdRepository
import at.wrk.tafel.admin.backend.modules.household.Household
import at.wrk.tafel.admin.backend.modules.household.internal.converter.HouseholdConverter
import io.mockk.every
import io.mockk.impl.annotations.InjectMockKs
import io.mockk.impl.annotations.RelaxedMockK
import io.mockk.junit5.MockKExtension
import io.mockk.mockk
import org.assertj.core.api.Assertions.assertThat
import org.junit.jupiter.api.Test
import org.junit.jupiter.api.extension.ExtendWith
import org.springframework.jdbc.core.JdbcTemplate
import org.springframework.jdbc.core.RowMapper

@ExtendWith(MockKExtension::class)
internal class HouseholdDuplicationServiceTest {

    @RelaxedMockK
    private lateinit var householdRepository: HouseholdRepository

    @RelaxedMockK
    private lateinit var householdConverter: HouseholdConverter

    @RelaxedMockK
    private lateinit var jdbcTemplate: JdbcTemplate

    @InjectMockKs
    private lateinit var service: HouseholdDuplicationService

    @Test
    fun `fetch duplicates and data mapped properly`() {
        val page = 3
        val pageSize = 1
        val totalCount = 100L

        val householdEntity1 = mockk<HouseholdEntity>(relaxed = true)
        val household1 = mockk<Household>(relaxed = true)
        every { householdRepository.findByHouseholdId(1) } returns householdEntity1
        every { householdConverter.mapEntityToHousehold(householdEntity1) } returns household1

        val householdEntity2 = mockk<HouseholdEntity>(relaxed = true)
        val household2 = mockk<Household>(relaxed = true)
        every { householdRepository.findByHouseholdId(2) } returns householdEntity2
        every { householdConverter.mapEntityToHousehold(householdEntity2) } returns household2

        val householdEntity3 = mockk<HouseholdEntity>(relaxed = true)
        val household3 = mockk<Household>(relaxed = true)
        every { householdRepository.findByHouseholdId(3) } returns householdEntity3
        every { householdConverter.mapEntityToHousehold(householdEntity3) } returns household3

        val householdEntity4 = mockk<HouseholdEntity>(relaxed = true)
        val household4 = mockk<Household>(relaxed = true)
        every { householdRepository.findByHouseholdId(4) } returns householdEntity4
        every { householdConverter.mapEntityToHousehold(householdEntity4) } returns household4

        every { jdbcTemplate.query(any<String>(), any<RowMapper<*>>()) } returns listOf(totalCount) andThen listOf(
            HouseholdDuplicateEntry(
                householdId = 1,
                compareHouseholdIdList = "2,3,4"
            )
        )

        val result = service.findDuplicates(page)

        assertThat(result.items).isEqualTo(
            listOf(
                HouseholdDuplicateSearchResultItem(
                    household = household1,
                    similarHouseholds = listOf(household2, household3, household4)
                )
            )
        )
        assertThat(result.totalCount).isEqualTo(totalCount)
        assertThat(result.pageSize).isEqualTo(pageSize)
        assertThat(result.currentPage).isEqualTo(page)
        assertThat(result.totalPages).isEqualTo(totalCount / pageSize)
    }

}
