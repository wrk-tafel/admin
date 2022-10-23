package at.wrk.tafel.admin.backend.modules.customer

import at.wrk.tafel.admin.backend.modules.customer.income.IncomeValidatorPerson
import at.wrk.tafel.admin.backend.modules.customer.income.IncomeValidatorResult
import at.wrk.tafel.admin.backend.modules.customer.income.IncomeValidatorService
import io.mockk.every
import io.mockk.impl.annotations.InjectMockKs
import io.mockk.impl.annotations.RelaxedMockK
import io.mockk.junit5.MockKExtension
import io.mockk.verify
import org.assertj.core.api.Assertions.assertThat
import org.junit.jupiter.api.Test
import org.junit.jupiter.api.extension.ExtendWith
import java.math.BigDecimal
import java.time.LocalDate

@ExtendWith(MockKExtension::class)
class CustomerServiceTest {

    @RelaxedMockK
    private lateinit var incomeValidatorService: IncomeValidatorService

    @InjectMockKs
    private lateinit var service: CustomerService

    @Test
    fun `validate customer`() {
        every { incomeValidatorService.validate(any()) } returns IncomeValidatorResult(
            valid = true,
            totalSum = BigDecimal("1"),
            limit = BigDecimal("2"),
            toleranceValue = BigDecimal("3"),
            amountExceededLimit = BigDecimal("4")
        )

        val result = service.validate(testCustomer)

        assertThat(result).isEqualTo(
            IncomeValidatorResult(
                valid = true,
                totalSum = BigDecimal("1"),
                limit = BigDecimal("2"),
                toleranceValue = BigDecimal("3"),
                amountExceededLimit = BigDecimal("4")
            )
        )

        verify {
            incomeValidatorService.validate(
                withArg {
                    assertThat(it[0])
                        .isEqualTo(
                            IncomeValidatorPerson(
                                birthDate = LocalDate.now().minusYears(30),
                                monthlyIncome = BigDecimal("1000")
                            )
                        )
                    assertThat(it[1])
                        .isEqualTo(
                            IncomeValidatorPerson(
                                birthDate = LocalDate.now().minusYears(5),
                                monthlyIncome = BigDecimal("100")
                            )
                        )
                    assertThat(it[2])
                        .isEqualTo(
                            IncomeValidatorPerson(
                                birthDate = LocalDate.now().minusYears(2)
                            )
                        )
                }
            )
        }
    }

}
