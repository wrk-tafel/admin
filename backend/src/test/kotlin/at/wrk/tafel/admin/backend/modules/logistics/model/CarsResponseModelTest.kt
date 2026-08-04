package at.wrk.tafel.admin.backend.modules.logistics.model

import at.wrk.tafel.admin.backend.common.validation.BeanValidationTestSupport.validator
import org.assertj.core.api.Assertions.assertThat
import org.junit.jupiter.api.Test

class CarsResponseModelTest {

    @Test
    fun `car request with blank fields is invalid`() {
        val car = CarRequest(id = null, licensePlate = "", name = "", enabled = true, sortOrder = 0)

        val violations = validator.validate(car)

        assertThat(violations).extracting<String> { it.propertyPath.toString() }
            .containsExactlyInAnyOrder("licensePlate", "name")
    }

    @Test
    fun `car request with filled fields is valid`() {
        val car = CarRequest(id = null, licensePlate = "W-12345", name = "Car", enabled = true, sortOrder = 0)

        val violations = validator.validate(car)

        assertThat(violations).isEmpty()
    }

    @Test
    fun `car reorder request with empty ids is invalid`() {
        val request = CarReorderRequest(carIds = emptyList())

        val violations = validator.validate(request)

        assertThat(violations).extracting<String> { it.propertyPath.toString() }
            .containsExactly("carIds")
    }
}
