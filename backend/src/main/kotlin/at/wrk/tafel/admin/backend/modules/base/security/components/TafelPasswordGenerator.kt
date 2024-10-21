package at.wrk.tafel.admin.backend.modules.base.security.components

import org.passay.CharacterRule
import org.passay.PasswordGenerator

class TafelPasswordGenerator(
    private val length: Int,
    private val generatedPasswordCharactersRules: List<CharacterRule>
) {

    fun generatePassword(): String {
        return PasswordGenerator().generatePassword(length, generatedPasswordCharactersRules)
    }

}
