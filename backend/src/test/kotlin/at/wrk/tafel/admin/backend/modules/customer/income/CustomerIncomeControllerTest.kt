package at.wrk.tafel.admin.backend.modules.customer.income

import io.mockk.every
import io.mockk.impl.annotations.InjectMockKs
import io.mockk.impl.annotations.RelaxedMockK
import io.mockk.junit5.MockKExtension
import io.mockk.verify
import org.assertj.core.api.Assertions.assertThat
import org.junit.jupiter.api.Test
import org.junit.jupiter.api.extension.ExtendWith
import java.math.BigDecimal

@ExtendWith(MockKExtension::class)
class CustomerIncomeControllerTest {

    @RelaxedMockK
    private lateinit var incomeValidatorService: IncomeValidatorService

    @InjectMockKs
    private lateinit var controller: CustomerIncomeController

    @Test
    fun `validateIncome`() {
        every { incomeValidatorService.validate(any()) } returns IncomeValidatorResult(
            true,
            totalSum = BigDecimal.ZERO,
            limit = BigDecimal.ZERO,
            amountExceededLimit = BigDecimal.ZERO
        )

        val request = ValidateIncomeRequest(
            persons = listOf(
                ValidateIncomePerson(
                    age = 30,
                    monthlyIncome = BigDecimal("1000")
                ),
                ValidateIncomePerson(
                    age = 40,
                    monthlyIncome = BigDecimal("2000")
                )
            )
        )

        val response = controller.validateIncome(request)

        assertThat(response.valid).isTrue
        verify {
            incomeValidatorService.validate(
                withArg {
                    assertThat(it[0]).isEqualTo(IncomeValidatorPerson(age = 30, monthlyIncome = BigDecimal("1000")))
                    assertThat(it[1]).isEqualTo(IncomeValidatorPerson(age = 40, monthlyIncome = BigDecimal("2000")))
                }
            )
        }
    }
}
