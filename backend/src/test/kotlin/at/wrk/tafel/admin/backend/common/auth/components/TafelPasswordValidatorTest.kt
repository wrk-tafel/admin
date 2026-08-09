package at.wrk.tafel.admin.backend.common.auth.components

import at.wrk.tafel.admin.backend.config.properties.PasswordAlphabet
import at.wrk.tafel.admin.backend.config.properties.PasswordMatchBehavior
import at.wrk.tafel.admin.backend.config.properties.TafelAdminPasswordNumberRangeProperties
import at.wrk.tafel.admin.backend.config.properties.TafelAdminProperties
import org.assertj.core.api.Assertions.assertThat
import org.junit.jupiter.api.Test
import org.passay.PasswordData
import org.passay.ValidationResult
import org.passay.rule.CharacterCharacteristicsRule
import org.passay.rule.CharacterOccurrencesRule
import org.passay.rule.DictionarySubstringRule
import org.passay.rule.LengthRule
import org.passay.rule.UsernameRule
import org.passay.rule.WhitespaceRule

internal class TafelPasswordValidatorTest {

    private val properties = TafelAdminProperties()
    private val validator = TafelPasswordValidator(properties)

    private fun validate(password: String, username: String = "test-username"): ValidationResult = validator.validate(PasswordData(username, password))

    private fun errorCodesOf(result: ValidationResult): List<String> = result.details.map { it.errorCode }

    @Test
    fun `password within the configured length is valid`() {
        assertThat(validate("valid-password").isValid).isTrue()
    }

    @Test
    fun `password shorter than the configured minimum is invalid`() {
        properties.password.minLength = 12

        val result = validate("elevenchars")

        assertThat(result.isValid).isFalse()
        assertThat(errorCodesOf(result)).contains(LengthRule.ERROR_CODE_MIN)
    }

    @Test
    fun `password longer than the configured maximum is invalid`() {
        properties.password.maxLength = 10

        val result = validate("waytoolongpassword")

        assertThat(result.isValid).isFalse()
        assertThat(errorCodesOf(result)).contains(LengthRule.ERROR_CODE_MAX)
    }

    @Test
    fun `password containing a configured forbidden word is invalid`() {
        properties.password.dictionary.forbiddenWords = listOf("tafel")

        val result = validate("my-TaFeL-password")

        assertThat(result.isValid).isFalse()
        assertThat(errorCodesOf(result)).contains(DictionarySubstringRule.ERROR_CODE)
    }

    @Test
    fun `forbidden words can be matched case-sensitively`() {
        properties.password.dictionary.forbiddenWords = listOf("tafel")
        properties.password.dictionary.ignoreCase = false

        assertThat(validate("my-TaFeL-password").isValid).isTrue()
        assertThat(validate("my-tafel-password").isValid).isFalse()
    }

    @Test
    fun `no forbidden words configured applies no dictionary rule`() {
        assertThat(validate("my-tafel-password").isValid).isTrue()
    }

    @Test
    fun `a forbidden password is rejected only as the whole password`() {
        properties.password.dictionary.forbiddenPasswords = listOf("passwort1")

        assertThat(validate("passwort1").isValid).isFalse()
        assertThat(validate("passwort1-und-mehr").isValid).isTrue()
    }

    @Test
    fun `password containing the username is invalid`() {
        val result = validate("x-test-username-x")

        assertThat(result.isValid).isFalse()
        assertThat(errorCodesOf(result)).contains(UsernameRule.ERROR_CODE)
    }

    @Test
    fun `the username rule can be switched off`() {
        properties.password.username.enabled = false

        assertThat(validate("x-test-username-x").isValid).isTrue()
    }

    @Test
    fun `the username rule can be narrowed to the start of the password`() {
        properties.password.username.matchBehavior = PasswordMatchBehavior.STARTS_WITH

        assertThat(validate("x-test-username-x").isValid).isTrue()
        assertThat(validate("test-username-x").isValid).isFalse()
    }

    @Test
    fun `the username rule can match backwards and ignore case`() {
        properties.password.username.matchBackwards = true
        properties.password.username.ignoreCase = true

        val result = validate("x-EMANRESU-TSET-x")

        assertThat(result.isValid).isFalse()
        assertThat(errorCodesOf(result)).contains(UsernameRule.ERROR_CODE_REVERSED)
    }

    @Test
    fun `password containing whitespace is invalid`() {
        val result = validate("with a space")

        assertThat(result.isValid).isFalse()
        assertThat(errorCodesOf(result)).contains(WhitespaceRule.ERROR_CODE)
    }

    @Test
    fun `the whitespace rule can be switched off`() {
        properties.password.whitespace.enabled = false

        assertThat(validate("with a space").isValid).isTrue()
    }

    @Test
    fun `character classes are required when a minimum is configured`() {
        properties.password.characters.minUpperCase = 1
        properties.password.characters.minDigits = 2

        assertThat(validate("nouppercase").isValid).isFalse()
        assertThat(validate("Upper1Digit2").isValid).isTrue()
    }

    @Test
    fun `the german alphabet counts umlauts as letters`() {
        properties.password.characters.minUpperCase = 1

        assertThat(validate("passwortÄ").isValid).isTrue()

        properties.password.alphabet = PasswordAlphabet.ENGLISH

        assertThat(validate("passwortÄ").isValid).isFalse()
    }

    @Test
    fun `minTypes requires only some of the configured character classes`() {
        properties.password.characters.minLowerCase = 1
        properties.password.characters.minUpperCase = 1
        properties.password.characters.minDigits = 1
        properties.password.characters.minSpecial = 1
        properties.password.characters.minTypes = 3

        // lower case, upper case and a digit - the missing special character is the allowed one
        assertThat(validate("Passwort1").isValid).isTrue()
        assertThat(validate("passwort1").isValid).isFalse()
    }

    /**
     * Passay throws when asked for more characteristics than it has rules to check, which would
     * turn a typo in the configuration into a failing password change rather than a stricter one.
     */
    @Test
    fun `minTypes above the number of configured classes is capped`() {
        properties.password.characters.minLowerCase = 1
        properties.password.characters.minDigits = 1
        properties.password.characters.minTypes = 5

        val result = validate("passwort1")

        assertThat(result.isValid).isTrue()
    }

    @Test
    fun `minTypes reports how many characteristics are missing`() {
        properties.password.characters.minLowerCase = 1
        properties.password.characters.minUpperCase = 1
        properties.password.characters.minDigits = 1
        properties.password.characters.minTypes = 3

        val result = validate("passwort")

        assertThat(result.isValid).isFalse()
        assertThat(errorCodesOf(result)).contains(CharacterCharacteristicsRule.ERROR_CODE)
    }

    @Test
    fun `alphabetical sequences are rejected when configured`() {
        properties.password.sequences.alphabetical.enabled = true
        properties.password.sequences.alphabetical.length = 5

        assertThat(validate("xabcdefx").isValid).isFalse()
        assertThat(validate("xabcxpasswort").isValid).isTrue()
    }

    @Test
    fun `numerical sequences are rejected when configured`() {
        properties.password.sequences.numerical.enabled = true

        assertThat(validate("pass12345word").isValid).isFalse()
    }

    @Test
    fun `keyboard sequences follow the configured alphabet`() {
        properties.password.sequences.keyboard.enabled = true

        // wertz is a run on a german keyboard, werty is one on an english one
        assertThat(validate("passwertz").isValid).isFalse()
        assertThat(validate("passwerty").isValid).isTrue()

        properties.password.alphabet = PasswordAlphabet.ENGLISH

        assertThat(validate("passwerty").isValid).isFalse()
        assertThat(validate("passwertz").isValid).isTrue()
    }

    /**
     * Passay ships keyboard data for English and German only, so under any other alphabet there is
     * no rule to apply - the setting is then simply without effect rather than an error.
     */
    @Test
    fun `keyboard sequences are not checked under an alphabet without a layout`() {
        properties.password.sequences.keyboard.enabled = true
        properties.password.alphabet = PasswordAlphabet.CZECH

        assertThat(validate("passwertz").isValid).isTrue()
    }

    @Test
    fun `a sequence shorter than passay allows is clamped instead of throwing`() {
        properties.password.sequences.numerical.enabled = true
        properties.password.sequences.numerical.length = 1

        assertThat(validate("pass123word").isValid).isFalse()
        assertThat(validate("pass12word").isValid).isTrue()
    }

    @Test
    fun `repeated characters are rejected when configured`() {
        properties.password.repeatedCharacters.enabled = true
        properties.password.repeatedCharacters.length = 3

        assertThat(validate("passaaaword").isValid).isFalse()
        assertThat(validate("passaaword").isValid).isTrue()
    }

    @Test
    fun `too many occurrences of one character are rejected when configured`() {
        properties.password.maxCharacterOccurrences = 2

        val result = validate("passsword")

        assertThat(result.isValid).isFalse()
        assertThat(errorCodesOf(result)).contains(CharacterOccurrencesRule.ERROR_CODE)
    }

    @Test
    fun `allowed characters restrict the password to that set`() {
        properties.password.allowedCharacters = "abcdefgh"

        assertThat(validate("abcdefgh").isValid).isTrue()
        assertThat(validate("abcdefghx").isValid).isFalse()
    }

    @Test
    fun `illegal characters are rejected`() {
        properties.password.illegalCharacters = "$%"

        assertThat(validate("passwort").isValid).isTrue()
        assertThat(validate("passwort%").isValid).isFalse()
    }

    @Test
    fun `every allowed pattern has to match`() {
        properties.password.allowedPatterns = listOf(".*\\d.*", ".*[A-Z].*")

        assertThat(validate("Passwort1").isValid).isTrue()
        assertThat(validate("passwort1").isValid).isFalse()
    }

    @Test
    fun `no illegal pattern may match`() {
        properties.password.illegalPatterns = listOf("\\d\\d\\d\\d")

        assertThat(validate("passwort123").isValid).isTrue()
        assertThat(validate("passwort1234").isValid).isFalse()
    }

    @Test
    fun `numbers in an illegal range are rejected`() {
        properties.password.illegalNumberRanges = listOf(
            TafelAdminPasswordNumberRangeProperties().apply {
                lower = 1900
                upper = 2100
            },
        )

        assertThat(validate("passwort1985").isValid).isFalse()
        assertThat(validate("passwort1885").isValid).isTrue()
    }

    @Test
    fun `violations are reported in german`() {
        properties.password.minLength = 20

        val result = validate("kurz tafel")

        assertThat(result.isValid).isFalse()
        assertThat(result.messages).containsExactlyInAnyOrder(
            "Das Passwort muss mindestens 20 Zeichen lang sein.",
            "Leerzeichen sind nicht erlaubt.",
        )
    }

    @Test
    fun `every configurable rule resolves to a german message`() {
        properties.password.minLength = 30
        properties.password.characters.minUpperCase = 1
        properties.password.characters.minSpecial = 1
        properties.password.dictionary.forbiddenWords = listOf("tafel")
        properties.password.sequences.numerical.enabled = true
        properties.password.sequences.alphabetical.enabled = true
        properties.password.repeatedCharacters.enabled = true
        properties.password.repeatedCharacters.length = 3
        properties.password.maxCharacterOccurrences = 2
        properties.password.illegalCharacters = "%"
        properties.password.allowedPatterns = listOf(".*XYZ.*")
        properties.password.illegalPatterns = listOf("aaa")
        properties.password.illegalNumberRanges = listOf(
            TafelAdminPasswordNumberRangeProperties().apply {
                lower = 1900
                upper = 2100
            },
        )

        val result = validate("tafel abcde 12345 aaa 1985 %test-username", username = "test-username")

        assertThat(result.isValid).isFalse()
        // an untranslated rule falls back to its bare error code, e.g. "TOO_SHORT:{...}"
        assertThat(result.messages).isNotEmpty()
        assertThat(result.messages).allSatisfy { message ->
            assertThat(message).doesNotMatch("^[A-Z_]+(:.*)?$")
        }
    }

    /**
     * The reason the rules are assembled per call: an operator's edit is re-bound into the very
     * properties instance this validator holds (see `ConfigFileReloadService`), and the next
     * password checked has to be judged by the new rules rather than the ones present at startup.
     */
    @Test
    fun `validates against reloaded configuration`() {
        assertThat(validate("valid-password").isValid).isTrue()

        properties.password.minLength = 30
        properties.password.dictionary.forbiddenWords = listOf("valid")

        assertThat(validate("valid-password").isValid).isFalse()
    }
}
