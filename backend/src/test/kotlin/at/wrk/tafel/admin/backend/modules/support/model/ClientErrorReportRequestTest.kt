package at.wrk.tafel.admin.backend.modules.support.model

import at.wrk.tafel.admin.backend.common.validation.BeanValidationTestSupport.validator
import org.assertj.core.api.Assertions.assertThat
import org.junit.jupiter.api.Test

class ClientErrorReportRequestTest {

    @Test
    fun `report with just a message is valid`() {
        val request = ClientErrorReportRequest(message = "TypeError: x is not a function")

        val violations = validator.validate(request)

        assertThat(violations).isEmpty()
    }

    @Test
    fun `report with a blank message is invalid`() {
        val request = ClientErrorReportRequest(message = " ")

        val violations = validator.validate(request)

        assertThat(violations).extracting<String> { it.propertyPath.toString() }
            .containsExactly("message")
    }

    @Test
    fun `report with a message exceeding max length is invalid`() {
        val request = ClientErrorReportRequest(message = "x".repeat(1001))

        val violations = validator.validate(request)

        assertThat(violations).extracting<String> { it.propertyPath.toString() }
            .containsExactly("message")
    }

    @Test
    fun `report with a page exceeding max length is invalid`() {
        val request = ClientErrorReportRequest(message = "boom", page = "x".repeat(501))

        val violations = validator.validate(request)

        assertThat(violations).extracting<String> { it.propertyPath.toString() }
            .containsExactly("page")
    }
}
