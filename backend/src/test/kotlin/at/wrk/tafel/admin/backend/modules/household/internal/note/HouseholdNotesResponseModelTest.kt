package at.wrk.tafel.admin.backend.modules.household.internal.note

import at.wrk.tafel.admin.backend.common.validation.BeanValidationTestSupport.validator
import org.assertj.core.api.Assertions.assertThat
import org.junit.jupiter.api.Test

class HouseholdNotesResponseModelTest {

    @Test
    fun `create household note request with blank note is invalid`() {
        val request = CreateHouseholdNoteRequest(note = "")

        val violations = validator.validate(request)

        assertThat(violations).extracting<String> { it.propertyPath.toString() }
            .containsExactly("note")
    }

    @Test
    fun `create household note request with filled note is valid`() {
        val request = CreateHouseholdNoteRequest(note = "Note")

        val violations = validator.validate(request)

        assertThat(violations).isEmpty()
    }
}
