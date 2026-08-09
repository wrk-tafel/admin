package at.wrk.tafel.admin.backend.common.auth.components

import at.wrk.tafel.admin.backend.config.properties.TafelAdminProperties
import org.assertj.core.api.Assertions.assertThat
import org.junit.jupiter.api.Test
import org.passay.PasswordData
import org.passay.rule.DictionarySubstringRule
import org.passay.rule.LengthRule
import org.passay.rule.UsernameRule
import org.passay.rule.WhitespaceRule

internal class TafelPasswordValidatorTest {

    @Test
    fun `password within the configured length is valid`() {
        val validator = TafelPasswordValidator(TafelAdminProperties())

        val result = validator.validate(PasswordData("test-username", "valid-password"))

        assertThat(result.isValid).isTrue()
    }

    @Test
    fun `password shorter than the configured minimum is invalid`() {
        val validator = TafelPasswordValidator(
            TafelAdminProperties().apply { password.minLength = 12 },
        )

        val result = validator.validate(PasswordData("test-username", "elevenchars"))

        assertThat(result.isValid).isFalse()
        assertThat(result.details.map { it.errorCode }).contains(LengthRule.ERROR_CODE_MIN)
    }

    @Test
    fun `password longer than the configured maximum is invalid`() {
        val validator = TafelPasswordValidator(
            TafelAdminProperties().apply { password.maxLength = 10 },
        )

        val result = validator.validate(PasswordData("test-username", "waytoolongpassword"))

        assertThat(result.isValid).isFalse()
        assertThat(result.details.map { it.errorCode }).contains(LengthRule.ERROR_CODE_MAX)
    }

    @Test
    fun `password containing a configured forbidden word is invalid`() {
        val validator = TafelPasswordValidator(
            TafelAdminProperties().apply { password.forbiddenWords = listOf("tafel") },
        )

        val result = validator.validate(PasswordData("test-username", "my-TaFeL-password"))

        assertThat(result.isValid).isFalse()
        assertThat(result.details.map { it.errorCode }).contains(DictionarySubstringRule.ERROR_CODE)
    }

    @Test
    fun `password containing a word forbidden elsewhere is valid without that word configured`() {
        val validator = TafelPasswordValidator(
            TafelAdminProperties().apply { password.forbiddenWords = listOf("something-else") },
        )

        assertThat(validator.validate(PasswordData("test-username", "my-tafel-password")).isValid).isTrue()
    }

    @Test
    fun `no forbidden words configured applies no dictionary rule`() {
        val validator = TafelPasswordValidator(TafelAdminProperties())

        assertThat(validator.validate(PasswordData("test-username", "my-tafel-password")).isValid).isTrue()
    }

    @Test
    fun `password containing the username is invalid`() {
        val validator = TafelPasswordValidator(TafelAdminProperties())

        val result = validator.validate(PasswordData("test-username", "x-test-username-x"))

        assertThat(result.isValid).isFalse()
        assertThat(result.details.map { it.errorCode }).contains(UsernameRule.ERROR_CODE)
    }

    @Test
    fun `password containing whitespace is invalid`() {
        val validator = TafelPasswordValidator(TafelAdminProperties())

        val result = validator.validate(PasswordData("test-username", "with a space"))

        assertThat(result.isValid).isFalse()
        assertThat(result.details.map { it.errorCode }).contains(WhitespaceRule.ERROR_CODE)
    }

    /**
     * The reason the rules are assembled per call: an operator's edit is re-bound into the very
     * properties instance this validator holds (see `ConfigFileReloadService`), and the next
     * password checked has to be judged by the new rules rather than the ones present at startup.
     */
    @Test
    fun `validates against reloaded configuration`() {
        val properties = TafelAdminProperties()
        val validator = TafelPasswordValidator(properties)
        assertThat(validator.validate(PasswordData("test-username", "valid-password")).isValid).isTrue()

        properties.password.minLength = 30
        properties.password.forbiddenWords = listOf("valid")

        assertThat(validator.validate(PasswordData("test-username", "valid-password")).isValid).isFalse()
    }
}
