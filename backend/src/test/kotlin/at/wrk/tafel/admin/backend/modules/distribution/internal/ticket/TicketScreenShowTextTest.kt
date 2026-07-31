package at.wrk.tafel.admin.backend.modules.distribution.internal.ticket

import at.wrk.tafel.admin.backend.common.validation.BeanValidationTestSupport.validator
import org.assertj.core.api.Assertions.assertThat
import org.junit.jupiter.api.Test

class TicketScreenShowTextTest {

    @Test
    fun `ticket screen show text with blank text is invalid`() {
        val request = TicketScreenShowText(text = "", value = null)

        val violations = validator.validate(request)

        assertThat(violations).extracting<String> { it.propertyPath.toString() }
            .containsExactly("text")
    }

    @Test
    fun `ticket screen show text with filled text is valid`() {
        val request = TicketScreenShowText(text = "Ticket", value = "1")

        val violations = validator.validate(request)

        assertThat(violations).isEmpty()
    }
}
