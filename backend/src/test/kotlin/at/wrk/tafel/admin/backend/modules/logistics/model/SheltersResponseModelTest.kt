package at.wrk.tafel.admin.backend.modules.logistics.model

import at.wrk.tafel.admin.backend.common.validation.BeanValidationTestSupport.validator
import org.assertj.core.api.Assertions.assertThat
import org.junit.jupiter.api.Test

class SheltersResponseModelTest {

    private fun validShelter() = Shelter(
        id = null,
        name = "Shelter",
        addressStreet = "Street",
        addressHouseNumber = "1",
        addressStairway = null,
        addressDoor = null,
        addressPostalCode = 1010,
        addressCity = "Vienna",
        note = null,
        personsCount = 1,
        enabled = true,
        sortOrder = 0,
        contacts = emptyList(),
    )

    @Test
    fun `shelter with blank and invalid fields is invalid`() {
        val shelter = validShelter().copy(
            name = "",
            addressStreet = "",
            addressHouseNumber = "",
            addressPostalCode = 0,
            addressCity = "",
            personsCount = -1,
        )

        val violations = validator.validate(shelter)

        assertThat(violations).extracting<String> { it.propertyPath.toString() }
            .containsExactlyInAnyOrder(
                "name",
                "addressStreet",
                "addressHouseNumber",
                "addressPostalCode",
                "addressCity",
                "personsCount",
            )
    }

    @Test
    fun `shelter cascades into blank contact phone`() {
        val shelter = validShelter().copy(
            contacts = listOf(ShelterContact(firstname = "A", lastname = "B", phone = "")),
        )

        val violations = validator.validate(shelter)

        assertThat(violations).extracting<String> { it.propertyPath.toString() }
            .containsExactly("contacts[0].phone")
    }

    @Test
    fun `shelter with valid values is valid`() {
        val violations = validator.validate(validShelter())

        assertThat(violations).isEmpty()
    }

    @Test
    fun `shelter reorder request with empty ids is invalid`() {
        val request = ShelterReorderRequest(shelterIds = emptyList())

        val violations = validator.validate(request)

        assertThat(violations).extracting<String> { it.propertyPath.toString() }
            .containsExactly("shelterIds")
    }
}
