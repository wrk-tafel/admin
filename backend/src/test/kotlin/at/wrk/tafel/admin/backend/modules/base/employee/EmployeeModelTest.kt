package at.wrk.tafel.admin.backend.modules.base.employee

import at.wrk.tafel.admin.backend.common.validation.BeanValidationTestSupport.validator
import org.assertj.core.api.Assertions.assertThat
import org.junit.jupiter.api.Test

class EmployeeModelTest {

    @Test
    fun `employee create request with blank fields is invalid`() {
        val request = EmployeeCreateRequest(personnelNumber = "", firstname = "", lastname = "")

        val violations = validator.validate(request)

        assertThat(violations).extracting<String> { it.propertyPath.toString() }
            .containsExactlyInAnyOrder("personnelNumber", "firstname", "lastname")
    }

    @Test
    fun `employee create request with filled fields is valid`() {
        val request = EmployeeCreateRequest(personnelNumber = "123", firstname = "Max", lastname = "Mustermann")

        val violations = validator.validate(request)

        assertThat(violations).isEmpty()
    }
}
