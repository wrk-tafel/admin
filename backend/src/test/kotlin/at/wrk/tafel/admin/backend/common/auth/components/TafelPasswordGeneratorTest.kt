package at.wrk.tafel.admin.backend.common.auth.components

import at.wrk.tafel.admin.backend.config.WebSecurityConfig
import org.assertj.core.api.Assertions.assertThat
import org.junit.jupiter.api.Test
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
        val password = TafelPasswordGenerator(10, generatedPasswordCharactersRules).generatePassword()
        assertThat(password).hasSize(10)
    }

    @Test
    fun `generate password retries until the password is acceptable`() {
        var attempts = 0
        val generator = TafelPasswordGenerator(10, generatedPasswordCharactersRules) { ++attempts >= 3 }

        generator.generatePassword()

        assertThat(attempts).isEqualTo(3)
    }

    /**
     * A random password can contain "1234", "aaaa" or a keyboard row - the generator wired up in
     * WebSecurityConfig must never hand out one that the rules for a chosen password refuse.
     */
    @Test
    fun `a generated password always passes the password rules`() {
        val generator = WebSecurityConfig.passwordGenerator()

        repeat(2000) {
            val password = generator.generatePassword()
            assertThat(WebSecurityConfig.isAcceptablePassword(password)).`as`(password).isTrue()
        }
    }
}
