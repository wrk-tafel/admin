package at.wrk.tafel.admin.backend.modules.settings.model

import at.wrk.tafel.admin.backend.common.validation.BeanValidationTestSupport.validator
import org.assertj.core.api.Assertions.assertThat
import org.junit.jupiter.api.Test
import java.math.BigDecimal
import java.time.LocalDate

class StaticValueSettingsModelTest {

    @Test
    fun `static value item with blank type and negative numbers is invalid`() {
        val item = StaticValueItem(
            id = null,
            type = "",
            validFrom = LocalDate.now(),
            validTo = LocalDate.now(),
            amount = BigDecimal(-1),
            countAdults = -1,
            countChildren = -1,
            age = -1,
        )

        val violations = validator.validate(item)

        assertThat(violations).extracting<String> { it.propertyPath.toString() }
            .containsExactlyInAnyOrder("type", "amount", "countAdults", "countChildren", "age")
    }

    @Test
    fun `static value item with valid values is valid`() {
        val item = StaticValueItem(
            id = null,
            type = "COST_CONTRIBUTION",
            validFrom = LocalDate.now(),
            validTo = LocalDate.now(),
            amount = BigDecimal.ZERO,
            countAdults = 0,
            countChildren = 0,
            age = 0,
        )

        val violations = validator.validate(item)

        assertThat(violations).isEmpty()
    }
}
