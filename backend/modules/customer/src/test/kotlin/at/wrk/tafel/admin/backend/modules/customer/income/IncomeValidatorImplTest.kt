package at.wrk.tafel.admin.backend.modules.customer.income

import org.assertj.core.api.Assertions.assertThat
import org.junit.jupiter.api.BeforeEach
import org.junit.jupiter.api.Test

class IncomeValidatorImplTest {

    private lateinit var incomeValidator: IncomeValidator

    @BeforeEach
    fun beforeEach() {
        incomeValidator = IncomeValidatorImpl()
    }

    @Test
    fun `no data given`() {
        val result = incomeValidator.validate(IncomeValidatorInput())

        assertThat(result).isFalse
    }
}
