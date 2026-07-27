package at.wrk.tafel.admin.backend.config

import org.assertj.core.api.Assertions.assertThat
import org.junit.jupiter.api.Test
import org.passay.rule.CharacterRule

class WebSecurityConfigTest {

    @Test
    fun `passwordLengthRule enforces the expected minimum and maximum length`() {
        assertThat(WebSecurityConfig.passwordLengthRule.minimumLength).isEqualTo(8)
        assertThat(WebSecurityConfig.passwordLengthRule.maximumLength).isEqualTo(50)
    }

    @Test
    fun `generatedPasswordCharactersRules requires lower case, upper case and digit characters`() {
        val rules = WebSecurityConfig.generatedPasswordCharactersRules

        assertThat(rules).hasSize(3)
        assertThat(rules).allSatisfy { rule -> assertThat(rule).isInstanceOf(CharacterRule::class.java) }
    }
}
