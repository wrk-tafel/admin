package at.wrk.tafel.admin.backend.modules.customer.income

import org.springframework.security.access.prepost.PreAuthorize
import org.springframework.web.bind.annotation.PostMapping
import org.springframework.web.bind.annotation.RequestBody
import org.springframework.web.bind.annotation.RequestMapping
import org.springframework.web.bind.annotation.RestController
import java.math.BigDecimal

@RestController
@RequestMapping("/api/customers")
@PreAuthorize("hasAuthority('CUSTOMER')")
class CustomerIncomeController(
    private val incomeValidatorService: IncomeValidatorService
) {

    @PostMapping("/validate-income")
    fun validateIncome(@RequestBody request: ValidateIncomeRequest): ValidateIncomeResponse {
        val result = incomeValidatorService.validate(request.persons.map { mapToValidationPerson(it) })
        return ValidateIncomeResponse(result.valid)
    }

    private fun mapToValidationPerson(person: ValidateIncomePerson): IncomeValidatorPerson {
        return IncomeValidatorPerson(
            monthlyIncome = person.monthlyIncome,
            age = person.age,
            compulsoryEducation = person.compulsoryEducation
        )
    }
}

data class ValidateIncomeRequest(
    val persons: List<ValidateIncomePerson>
)

data class ValidateIncomePerson(
    val monthlyIncome: BigDecimal,
    val age: Int,
    val compulsoryEducation: Boolean? = false
)

data class ValidateIncomeResponse(
    val valid: Boolean
)
