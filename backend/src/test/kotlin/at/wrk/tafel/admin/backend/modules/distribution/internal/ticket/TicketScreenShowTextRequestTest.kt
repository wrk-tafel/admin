package at.wrk.tafel.admin.backend.modules.distribution.internal.ticket

import at.wrk.tafel.admin.backend.common.validation.BeanValidationTestSupport.validator
import org.assertj.core.api.Assertions.assertThat
import org.junit.jupiter.api.Test

class TicketScreenShowTextRequestTest {

    @Test
    fun `ticket screen show text request with blank text is invalid`() {
        val request = TicketScreenShowTextRequest(text = "", value = null)

        val violations = validator.validate(request)

        assertThat(violations).extracting<String> { it.propertyPath.toString() }
            .containsExactly("text")
    }

    @Test
    fun `ticket screen show text request with filled text is valid`() {
        val request = TicketScreenShowTextRequest(text = "Ticket", value = "1")

        val violations = validator.validate(request)

        assertThat(violations).isEmpty()
    }
}
