package at.wrk.tafel.admin.backend.common.auth.components

import org.assertj.core.api.Assertions.assertThat
import org.junit.jupiter.api.Test
import org.passay.CharacterRule
import org.passay.EnglishCharacterData
import org.passay.GermanCharacterData

internal class TafelPasswordGeneratorTest {

    @Test
    fun `generate password`() {
        val generatedPasswordCharactersRules = listOf(
            CharacterRule(GermanCharacterData.LowerCase),
            CharacterRule(GermanCharacterData.UpperCase),
            CharacterRule(EnglishCharacterData.Digit)
        )

        val password = TafelPasswordGenerator(10, generatedPasswordCharactersRules).generatePassword()
        assertThat(password).hasSize(10)
    }

}
