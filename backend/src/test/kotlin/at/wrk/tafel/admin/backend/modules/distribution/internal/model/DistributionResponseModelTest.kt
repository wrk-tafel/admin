package at.wrk.tafel.admin.backend.modules.distribution.internal.model

import at.wrk.tafel.admin.backend.common.validation.BeanValidationTestSupport.validator
import org.assertj.core.api.Assertions.assertThat
import org.junit.jupiter.api.Test

class DistributionResponseModelTest {

    @Test
    fun `assign household request with non-positive values is invalid`() {
        val request = AssignHouseholdRequest(householdId = 0, ticketNumber = 0)

        val violations = validator.validate(request)

        assertThat(violations).extracting<String> { it.propertyPath.toString() }
            .containsExactlyInAnyOrder("householdId", "ticketNumber")
    }

    @Test
    fun `assign household request with positive values is valid`() {
        val request = AssignHouseholdRequest(householdId = 1, ticketNumber = 1)

        val violations = validator.validate(request)

        assertThat(violations).isEmpty()
    }

    @Test
    fun `distribution statistic data with negative count and empty shelters is invalid`() {
        val data = DistributionStatisticData(employeeCount = -1, selectedShelterIds = emptyList())

        val violations = validator.validate(data)

        assertThat(violations).extracting<String> { it.propertyPath.toString() }
            .containsExactlyInAnyOrder("employeeCount", "selectedShelterIds")
    }

    @Test
    fun `distribution statistic data with valid values is valid`() {
        val data = DistributionStatisticData(employeeCount = 0, selectedShelterIds = listOf(1L))

        val violations = validator.validate(data)

        assertThat(violations).isEmpty()
    }
}
