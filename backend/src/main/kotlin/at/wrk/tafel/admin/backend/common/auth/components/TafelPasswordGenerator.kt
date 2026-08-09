package at.wrk.tafel.admin.backend.common.auth.components

import at.wrk.tafel.admin.backend.config.properties.TafelAdminProperties
import org.passay.generate.PasswordGenerator
import org.passay.rule.CharacterRule

class TafelPasswordGenerator(
    private val tafelAdminProperties: TafelAdminProperties,
    private val generatedPasswordCharactersRules: List<CharacterRule>,
) {

    fun generatePassword(): String = PasswordGenerator(generatedLength(), generatedPasswordCharactersRules).generate().toString()

    /**
     * Two characters above the configured minimum, so a generated password isn't sitting exactly on
     * the limit, and never above the configured maximum - both read per call, since the rules can be
     * changed while the application runs (`TafelPasswordValidator`).
     *
     * A maximum below the minimum is a misconfiguration in which no password can be valid at all;
     * the minimum wins there, so this still generates something rather than failing.
     */
    private fun generatedLength(): Int {
        val properties = tafelAdminProperties.password
        return (properties.minLength + 2).coerceAtMost(properties.maxLength).coerceAtLeast(properties.minLength)
    }
}
