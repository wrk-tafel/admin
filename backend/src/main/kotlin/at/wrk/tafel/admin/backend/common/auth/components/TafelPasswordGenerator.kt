package at.wrk.tafel.admin.backend.common.auth.components

import org.passay.generate.PasswordGenerator
import org.passay.rule.CharacterRule

class TafelPasswordGenerator(
    private val length: Int,
    private val generatedPasswordCharactersRules: List<CharacterRule>
) {

    fun generatePassword(): String {
        return PasswordGenerator(length, generatedPasswordCharactersRules).generate().toString()
    }

}
