package at.wrk.tafel.admin.backend.common.auth.components

import at.wrk.tafel.admin.backend.config.properties.TafelAdminProperties
import org.assertj.core.api.Assertions.assertThat
import org.junit.jupiter.api.Test
import org.passay.PasswordData
import org.passay.data.EnglishCharacterData
import org.passay.data.GermanCharacterData
import org.passay.rule.CharacterRule

internal class TafelPasswordGeneratorTest {

    private val generatedPasswordCharactersRules = listOf(
        CharacterRule(GermanCharacterData.LowerCase),
        CharacterRule(GermanCharacterData.UpperCase),
        CharacterRule(EnglishCharacterData.Digit),
    )

    @Test
    fun `generate password`() {
        val properties = TafelAdminProperties().apply { password.minLength = 8 }

        val password = TafelPasswordGenerator(properties, generatedPasswordCharactersRules).generatePassword()

        assertThat(password).hasSize(10)
    }

    @Test
    fun `generated password follows the configured minimum length`() {
        val properties = TafelAdminProperties().apply { password.minLength = 20 }

        val password = TafelPasswordGenerator(properties, generatedPasswordCharactersRules).generatePassword()

        assertThat(password).hasSize(22)
    }

    @Test
    fun `generated password never exceeds the configured maximum length`() {
        val properties = TafelAdminProperties().apply {
            password.minLength = 8
            password.maxLength = 9
        }

        val password = TafelPasswordGenerator(properties, generatedPasswordCharactersRules).generatePassword()

        assertThat(password).hasSize(9)
    }

    @Test
    fun `generated password satisfies the configured rules`() {
        val properties = TafelAdminProperties().apply { password.minLength = 12 }
        val generator = TafelPasswordGenerator(properties, generatedPasswordCharactersRules)

        val result = TafelPasswordValidator(properties).validate(
            PasswordData("test-username", generator.generatePassword()),
        )

        assertThat(result.isValid).isTrue()
    }

    /**
     * Same reason the validator rebuilds its rules per call: the configuration this reads is
     * re-bound in place while the application runs.
     */
    @Test
    fun `generates against reloaded configuration`() {
        val properties = TafelAdminProperties()
        val generator = TafelPasswordGenerator(properties, generatedPasswordCharactersRules)
        assertThat(generator.generatePassword()).hasSize(10)

        properties.password.minLength = 14

        assertThat(generator.generatePassword()).hasSize(16)
    }
}
