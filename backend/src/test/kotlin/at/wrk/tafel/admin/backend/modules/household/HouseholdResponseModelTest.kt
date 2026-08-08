package at.wrk.tafel.admin.backend.modules.household

import at.wrk.tafel.admin.backend.common.validation.BeanValidationTestSupport.validator
import at.wrk.tafel.admin.backend.modules.base.country.CountryItem
import org.assertj.core.api.Assertions.assertThat
import org.junit.jupiter.api.Test
import java.time.LocalDate

class HouseholdResponseModelTest {

    private val country = CountryItem(id = 1, code = "AT", name = "Austria")

    private fun validAddress() = HouseholdAddress(
        street = "Street",
        houseNumber = "1",
        postalCode = 1010,
        city = "Vienna",
    )

    private fun validPerson() = Person(
        firstname = "Max",
        lastname = "Mustermann",
        birthDate = LocalDate.now(),
        gender = PersonGender.MALE,
        country = country,
    )

    @Test
    fun `household address with blank and missing fields is invalid`() {
        val address = HouseholdAddress(street = "", houseNumber = "", postalCode = null, city = "")

        val violations = validator.validate(address)

        assertThat(violations).extracting<String> { it.propertyPath.toString() }
            .containsExactlyInAnyOrder("street", "houseNumber", "postalCode", "city")
    }

    @Test
    fun `household address with valid values is valid`() {
        val violations = validator.validate(validAddress())

        assertThat(violations).isEmpty()
    }

    @Test
    fun `person with blank and missing fields is invalid`() {
        val person = Person(firstname = "", lastname = "", birthDate = null, gender = null, country = country)

        val violations = validator.validate(person)

        assertThat(violations).extracting<String> { it.propertyPath.toString() }
            .containsExactlyInAnyOrder("firstname", "lastname", "birthDate", "gender")
    }

    @Test
    fun `household request with invalid email is invalid`() {
        val household = HouseholdRequest(address = validAddress(), email = "not-an-email")

        val violations = validator.validate(household)

        assertThat(violations).extracting<String> { it.propertyPath.toString() }
            .containsExactly("email")
    }

    @Test
    fun `household request cascades into address and persons`() {
        val household = HouseholdRequest(
            address = HouseholdAddress(street = "", houseNumber = "1", postalCode = 1010, city = "Vienna"),
            persons = listOf(validPerson().copy(firstname = "")),
        )

        val violations = validator.validate(household)

        assertThat(violations).extracting<String> { it.propertyPath.toString() }
            .containsExactlyInAnyOrder("address.street", "persons[0].firstname")
    }

    @Test
    fun `household request with valid values is valid`() {
        val household = HouseholdRequest(address = validAddress(), email = "test@example.com", persons = listOf(validPerson()))

        val violations = validator.validate(household)

        assertThat(violations).isEmpty()
    }

    @Test
    fun `household merge request with empty ids is invalid`() {
        val request = HouseholdMergeRequest(sourceHouseholdIds = emptyList())

        val violations = validator.validate(request)

        assertThat(violations).extracting<String> { it.propertyPath.toString() }
            .containsExactly("sourceHouseholdIds")
    }

    @Test
    fun `household merge request cascades into field selections`() {
        val request = HouseholdMergeRequest(
            sourceHouseholdIds = listOf(1),
            fieldSelections = listOf(HouseholdMergeFieldSelectionItem(field = null, sourceHouseholdId = 1)),
        )

        val violations = validator.validate(request)

        assertThat(violations).extracting<String> { it.propertyPath.toString() }
            .containsExactly("fieldSelections[0].field")
    }
}
