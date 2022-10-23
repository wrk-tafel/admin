package at.wrk.tafel.admin.backend.modules.customer

import at.wrk.tafel.admin.backend.modules.customer.income.IncomeValidatorPerson
import at.wrk.tafel.admin.backend.modules.customer.income.IncomeValidatorResult
import at.wrk.tafel.admin.backend.modules.customer.income.IncomeValidatorService
import org.springframework.stereotype.Service

@Service
class CustomerService(
    private val incomeValidatorService: IncomeValidatorService
) {
    fun validate(customer: Customer): IncomeValidatorResult {
        return incomeValidatorService.validate(mapToValidationPersons(customer))
    }

    private fun mapToValidationPersons(customer: Customer): List<IncomeValidatorPerson> {
        val personList = mutableListOf<IncomeValidatorPerson>()
        personList.add(
            IncomeValidatorPerson(
                monthlyIncome = customer.income, birthDate = customer.birthDate
            )
        )

        customer.additionalPersons.forEach {
            personList.add(
                IncomeValidatorPerson(
                    monthlyIncome = it.income, birthDate = it.birthDate
                )
            )
        }

        return personList
    }

}
