package at.wrk.tafel.admin.backend.modules.support.model

import at.wrk.tafel.admin.backend.common.validation.BeanValidationTestSupport.validator
import org.assertj.core.api.Assertions.assertThat
import org.junit.jupiter.api.Test

class SupportRequestTest {

    @Test
    fun `support request with valid title and text is valid`() {
        val request = SupportRequest(title = "Bug in login", text = "Something is broken")

        val violations = validator.validate(request)

        assertThat(violations).isEmpty()
    }

    @Test
    fun `support request with text exceeding max length is invalid`() {
        val request = SupportRequest(title = "Bug in login", text = "x".repeat(5001))

        val violations = validator.validate(request)

        assertThat(violations).extracting<String> { it.propertyPath.toString() }
            .containsExactly("text")
    }
}
