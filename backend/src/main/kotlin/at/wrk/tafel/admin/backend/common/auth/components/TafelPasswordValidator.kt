package at.wrk.tafel.admin.backend.common.auth.components

import at.wrk.tafel.admin.backend.config.properties.TafelAdminProperties
import org.passay.DefaultPasswordValidator
import org.passay.PasswordData
import org.passay.ValidationResult
import org.passay.dictionary.ArrayWordList
import org.passay.dictionary.WordListDictionary
import org.passay.dictionary.sort.ArraysSort
import org.passay.rule.DictionarySubstringRule
import org.passay.rule.LengthRule
import org.passay.rule.Rule
import org.passay.rule.UsernameRule
import org.passay.rule.WhitespaceRule

/**
 * Checks a password against the rules this installation is configured with
 * (`tafeladmin.password`, see [at.wrk.tafel.admin.backend.config.properties.TafelAdminPasswordProperties]).
 *
 * The Passay rules are assembled per call rather than once at construction: the whole configuration
 * is re-bound in place while the application runs (see `ConfigFileReloadService`), and a validator
 * built from the values that happened to be there at startup would keep enforcing them long after
 * an operator changed them.
 *
 * Length and forbidden words come from configuration; that a password may not contain the username
 * and may not contain whitespace does not - neither is a policy an installation would want to differ
 * on, and both are cheap to keep unconditional.
 */
class TafelPasswordValidator(
    private val tafelAdminProperties: TafelAdminProperties,
) {

    fun validate(data: PasswordData): ValidationResult = DefaultPasswordValidator(currentRules()).validate(data)

    private fun currentRules(): List<Rule> {
        val properties = tafelAdminProperties.password
        val forbiddenWords = properties.forbiddenWords.filter { it.isNotBlank() }

        return listOfNotNull(
            LengthRule(properties.minLength, properties.maxLength),
            UsernameRule(),
            WhitespaceRule(),
            // Passay needs a non-empty word list to build a dictionary from, and "no forbidden
            // words configured" means the rule simply doesn't exist for this installation.
            forbiddenWords.takeIf { it.isNotEmpty() }?.let { words ->
                DictionarySubstringRule(
                    WordListDictionary(
                        ArrayWordList(words.toTypedArray(), false, ArraysSort()),
                    ),
                )
            },
        )
    }
}
