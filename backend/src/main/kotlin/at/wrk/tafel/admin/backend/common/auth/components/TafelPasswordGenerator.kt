package at.wrk.tafel.admin.backend.common.auth.components

import org.passay.generate.PasswordGenerator
import org.passay.rule.CharacterRule

/**
 * Builds a random password from [generatedPasswordCharactersRules] and hands out only one that
 * [isAcceptable] lets through - the password rules also refuse sequences ("1234"), runs of one
 * character and common passwords, which a random password can happen to contain, and a generated
 * password must never be one the user could not have chosen themselves.
 */
class TafelPasswordGenerator(
    private val length: Int,
    private val generatedPasswordCharactersRules: List<CharacterRule>,
    private val isAcceptable: (String) -> Boolean = { true },
) {

    companion object {
        // Far above what is ever needed: a random password of this length hits a refused pattern
        // only rarely, so this bounds a misconfiguration rather than ordinary bad luck.
        private const val MAX_ATTEMPTS = 1000
    }

    fun generatePassword(): String {
        repeat(MAX_ATTEMPTS) {
            val candidate = PasswordGenerator(length, generatedPasswordCharactersRules).generate().toString()
            if (isAcceptable(candidate)) {
                return candidate
            }
        }
        error("No acceptable password generated in $MAX_ATTEMPTS attempts")
    }
}
