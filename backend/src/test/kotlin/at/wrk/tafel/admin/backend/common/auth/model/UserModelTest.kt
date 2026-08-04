package at.wrk.tafel.admin.backend.common.auth.model

import at.wrk.tafel.admin.backend.common.validation.BeanValidationTestSupport.validator
import org.assertj.core.api.Assertions.assertThat
import org.junit.jupiter.api.Test

class UserModelTest {

    @Test
    fun `change password request with blank fields is invalid`() {
        val request = ChangePasswordRequest(passwordCurrent = "", passwordNew = "")

        val violations = validator.validate(request)

        assertThat(violations).extracting<String> { it.propertyPath.toString() }
            .containsExactlyInAnyOrder("passwordCurrent", "passwordNew")
    }

    @Test
    fun `change password request with filled fields is valid`() {
        val request = ChangePasswordRequest(passwordCurrent = "current", passwordNew = "new")

        val violations = validator.validate(request)

        assertThat(violations).isEmpty()
    }

    @Test
    fun `user request with blank required fields is invalid`() {
        val user = UserRequest(
            id = null,
            personnelNumber = "",
            username = "",
            firstname = "",
            lastname = "",
            enabled = true,
            passwordChangeRequired = false,
            permissions = emptyList(),
        )

        val violations = validator.validate(user)

        assertThat(violations).extracting<String> { it.propertyPath.toString() }
            .containsExactlyInAnyOrder("personnelNumber", "username", "firstname", "lastname")
    }

    @Test
    fun `user request with filled required fields is valid`() {
        val user = UserRequest(
            id = null,
            personnelNumber = "123",
            username = "username",
            firstname = "Max",
            lastname = "Mustermann",
            enabled = true,
            passwordChangeRequired = false,
            permissions = emptyList(),
        )

        val violations = validator.validate(user)

        assertThat(violations).isEmpty()
    }
}
