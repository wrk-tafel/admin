package at.wrk.tafel.admin.backend.common.auth.components

import org.passay.FailureRuleResult
import org.passay.PasswordData
import org.passay.RuleResult
import org.passay.RuleResultDetail
import org.passay.SuccessRuleResult
import org.passay.dictionary.ArrayWordList
import org.passay.dictionary.WordListDictionary
import org.passay.dictionary.sort.ArraysSort
import org.passay.rule.DictionaryRule
import org.passay.rule.Rule

/**
 * Refuses a password that is - as a whole, ignoring case - one of the commonly used passwords in
 * `password-blocklist.txt` (e.g. "Passwort2024", "Willkommen1"): they satisfy the length and
 * character-class rules, and are exactly what gets guessed first.
 *
 * A wrapper rather than a plain [DictionaryRule]: that one reports the same error code as the
 * WRK-substring [org.passay.rule.DictionarySubstringRule] next to it, whose message names the word
 * it found. This one reports [ERROR_CODE] and nothing else, so the message never repeats the
 * password back.
 */
class CommonPasswordRule(blocklist: List<String>) : Rule {

    companion object {
        const val ERROR_CODE = "COMMON_PASSWORD"
        private const val BLOCKLIST_RESOURCE = "/password-blocklist.txt"

        /**
         * The bundled list, read once per process - a classpath resource cannot change while the
         * application runs. Blank lines and `#` comments are skipped.
         */
        val bundledBlocklist: List<String> by lazy {
            val stream = CommonPasswordRule::class.java.getResourceAsStream(BLOCKLIST_RESOURCE)
                ?: error("$BLOCKLIST_RESOURCE is missing from the classpath")
            stream.bufferedReader(Charsets.UTF_8).useLines { lines ->
                lines.map { it.trim() }.filter { it.isNotEmpty() && !it.startsWith("#") }.toList()
            }
        }
    }

    private val dictionaryRule = DictionaryRule(
        WordListDictionary(ArrayWordList(blocklist.toTypedArray(), false, ArraysSort())),
    )

    override fun validate(passwordData: PasswordData): RuleResult = if (dictionaryRule.validate(passwordData).isValid) {
        SuccessRuleResult()
    } else {
        FailureRuleResult(RuleResultDetail(ERROR_CODE, emptyMap()))
    }
}
