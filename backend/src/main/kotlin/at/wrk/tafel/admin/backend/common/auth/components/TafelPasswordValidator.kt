package at.wrk.tafel.admin.backend.common.auth.components

import at.wrk.tafel.admin.backend.config.properties.PasswordAlphabet
import at.wrk.tafel.admin.backend.config.properties.PasswordMatchBehavior
import at.wrk.tafel.admin.backend.config.properties.PasswordSpecialCharacters
import at.wrk.tafel.admin.backend.config.properties.TafelAdminPasswordProperties
import at.wrk.tafel.admin.backend.config.properties.TafelAdminPasswordSequenceProperties
import at.wrk.tafel.admin.backend.config.properties.TafelAdminProperties
import org.passay.DefaultPasswordValidator
import org.passay.PasswordData
import org.passay.UnicodeString
import org.passay.ValidationResult
import org.passay.data.CharacterData
import org.passay.data.CyrillicCharacterData
import org.passay.data.CyrillicModernCharacterData
import org.passay.data.CyrillicModernSequenceData
import org.passay.data.CyrillicSequenceData
import org.passay.data.CzechCharacterData
import org.passay.data.CzechSequenceData
import org.passay.data.EnglishCharacterData
import org.passay.data.EnglishSequenceData
import org.passay.data.GermanCharacterData
import org.passay.data.GermanSequenceData
import org.passay.data.PolishCharacterData
import org.passay.data.PolishSequenceData
import org.passay.data.SequenceData
import org.passay.dictionary.ArrayWordList
import org.passay.dictionary.WordListDictionary
import org.passay.dictionary.sort.ArraysSort
import org.passay.resolver.PropertiesMessageResolver
import org.passay.rule.AllowedCharacterRule
import org.passay.rule.AllowedRegexRule
import org.passay.rule.CharacterCharacteristicsRule
import org.passay.rule.CharacterOccurrencesRule
import org.passay.rule.CharacterRule
import org.passay.rule.DictionaryRule
import org.passay.rule.DictionarySubstringRule
import org.passay.rule.IllegalCharacterRule
import org.passay.rule.IllegalRegexRule
import org.passay.rule.IllegalSequenceRule
import org.passay.rule.LengthRule
import org.passay.rule.MatchBehavior
import org.passay.rule.NumberRangeRule
import org.passay.rule.RepeatCharactersRule
import org.passay.rule.Rule
import org.passay.rule.UsernameRule
import org.passay.rule.WhitespaceRule
import java.util.Locale
import java.util.Properties

/**
 * Checks a password against the rules this installation is configured with - see
 * [TafelAdminPasswordProperties] for the policy itself and for the two Passay rules that are
 * deliberately not configurable.
 *
 * The Passay rules are assembled per call rather than once at construction: the whole configuration
 * is re-bound in place while the application runs (see `ConfigFileReloadService`), and a validator
 * built from the values that happened to be there at startup would keep enforcing them long after
 * an operator changed them. Assembling a handful of small objects per password change is not worth
 * caching around.
 *
 * A rule whose configuration switches it off is left out entirely rather than added in a
 * do-nothing form, so [ValidationResult.getDetails] can only ever report a rule this installation
 * actually asked for.
 *
 * Violations come back as German sentences from [MESSAGE_RESOLVER] - Passay's own message mechanism
 * with a translated bundle, rather than a hand-written mapping, so a rule that gets switched on
 * cannot end up rejecting a password without saying why.
 *
 * [PasswordRuleDescriptions] turns the same properties into what the user is *told* up front. The
 * two are separate walks over one configuration and have to be kept in step - a new rule needs a
 * description there and a message in `passay-messages_de.properties` as well as a branch here.
 */
class TafelPasswordValidator(
    private val tafelAdminProperties: TafelAdminProperties,
) {

    companion object {
        /**
         * Passay's own resolver, reading the German bundle next to this class instead of the
         * library's English `passay.properties`. Immutable and thread-safe once loaded, so it is
         * built once even though the rules around it are not.
         */
        val MESSAGE_RESOLVER: PropertiesMessageResolver = PropertiesMessageResolver(loadGermanMessages(), Locale.GERMAN)

        // Passay rejects a shorter sequence outright, so a misconfigured length is clamped rather
        // than allowed to throw on every password change.
        private const val MINIMUM_SEQUENCE_LENGTH = 3

        private fun loadGermanMessages(): Properties {
            val properties = Properties()
            TafelPasswordValidator::class.java.getResourceAsStream("/passay-messages_de.properties").use { stream ->
                requireNotNull(stream) { "passay-messages_de.properties not found on the classpath" }
                    .reader(Charsets.UTF_8).use { properties.load(it) }
            }
            return properties
        }
    }

    fun validate(data: PasswordData): ValidationResult = DefaultPasswordValidator(MESSAGE_RESOLVER, currentRules()).validate(data)

    /** Internal so `PasswordRuleDescriptionsTest` can hold the descriptions against the real rule set. */
    internal fun currentRules(): List<Rule> {
        val properties = tafelAdminProperties.password

        return buildList {
            add(LengthRule(properties.minLength, properties.maxLength))
            addAll(characterRules(properties))
            addAll(dictionaryRules(properties))
            addAll(sequenceRules(properties))

            if (properties.username.enabled) {
                add(
                    UsernameRule(
                        properties.username.matchBackwards,
                        properties.username.ignoreCase,
                        properties.username.matchBehavior.toPassay(),
                    ),
                )
            }
            if (properties.whitespace.enabled) {
                add(WhitespaceRule(properties.whitespace.matchBehavior.toPassay()))
            }
            if (properties.repeatedCharacters.enabled) {
                add(RepeatCharactersRule(properties.repeatedCharacters.length, properties.repeatedCharacters.sequenceCount))
            }
            if (properties.maxCharacterOccurrences > 0) {
                add(CharacterOccurrencesRule(properties.maxCharacterOccurrences))
            }
            properties.allowedCharacters?.takeIf { it.isNotEmpty() }?.let {
                add(AllowedCharacterRule(UnicodeString(it)))
            }
            properties.illegalCharacters?.takeIf { it.isNotEmpty() }?.let {
                add(IllegalCharacterRule(UnicodeString(it)))
            }
            properties.allowedPatterns.filter { it.isNotBlank() }.forEach { add(AllowedRegexRule(it)) }
            properties.illegalPatterns.filter { it.isNotBlank() }.forEach { add(IllegalRegexRule(it)) }
            properties.illegalNumberRanges.forEach {
                add(NumberRangeRule(it.lower, it.upper, it.matchBehavior.toPassay()))
            }
        }
    }

    /**
     * One [CharacterRule] per configured class. With `minTypes` set they are wrapped in a
     * [CharacterCharacteristicsRule], which turns "all of these" into "at least this many of these"
     * - the usual "3 of 4 character classes" policy.
     */
    private fun characterRules(properties: TafelAdminPasswordProperties): List<Rule> {
        val alphabet = properties.alphabet
        val characters = properties.characters
        val characterRules = listOfNotNull(
            characterRule(alphabet.lowerCase(), characters.minLowerCase),
            characterRule(alphabet.upperCase(), characters.minUpperCase),
            characterRule(EnglishCharacterData.Digit, characters.minDigits),
            characterRule(characters.specialCharacters.toPassay(), characters.minSpecial),
            characterRule(alphabet.alphabetical(), characters.minAlphabetical),
        )

        if (characterRules.isEmpty()) {
            return emptyList()
        }
        if (characters.minTypes <= 0) {
            return characterRules
        }
        // Passay refuses to require more characteristics than it has rules to check.
        return listOf(CharacterCharacteristicsRule(characters.minTypes.coerceAtMost(characterRules.size), characterRules))
    }

    private fun characterRule(data: CharacterData, numberOfCharacters: Int): CharacterRule? = numberOfCharacters
        .takeIf { it > 0 }
        ?.let { CharacterRule(data, it) }

    private fun dictionaryRules(properties: TafelAdminPasswordProperties): List<Rule> {
        val dictionary = properties.dictionary
        return listOfNotNull(
            wordListDictionary(dictionary.forbiddenWords, dictionary.ignoreCase)?.let {
                DictionarySubstringRule(it, dictionary.matchBackwards)
            },
            wordListDictionary(dictionary.forbiddenPasswords, dictionary.ignoreCase)?.let {
                DictionaryRule(it, dictionary.matchBackwards)
            },
        )
    }

    // Passay needs a non-empty word list to build a dictionary from, and "no words configured"
    // means the rule simply doesn't exist for this installation.
    private fun wordListDictionary(words: List<String>, ignoreCase: Boolean): WordListDictionary? = words
        .filter { it.isNotBlank() }
        .takeIf { it.isNotEmpty() }
        ?.let { WordListDictionary(ArrayWordList(it.toTypedArray(), !ignoreCase, ArraysSort())) }

    private fun sequenceRules(properties: TafelAdminPasswordProperties): List<Rule> {
        val sequences = properties.sequences
        return listOfNotNull(
            sequenceRule(sequences.alphabetical, properties.alphabet.alphabeticalSequence()),
            // Digits read the same in every language, so there is only ever the one numerical set.
            sequenceRule(sequences.numerical, EnglishSequenceData.Numerical),
            sequenceRule(sequences.keyboard, properties.alphabet.keyboardSequence()),
        )
    }

    private fun sequenceRule(properties: TafelAdminPasswordSequenceProperties, data: SequenceData?): Rule? {
        if (!properties.enabled || data == null) {
            return null
        }
        return IllegalSequenceRule(data, properties.length.coerceAtLeast(MINIMUM_SEQUENCE_LENGTH), properties.wrap)
    }
}

internal fun PasswordMatchBehavior.toPassay(): MatchBehavior = when (this) {
    PasswordMatchBehavior.CONTAINS -> MatchBehavior.Contains
    PasswordMatchBehavior.STARTS_WITH -> MatchBehavior.StartsWith
    PasswordMatchBehavior.ENDS_WITH -> MatchBehavior.EndsWith
}

internal fun PasswordSpecialCharacters.toPassay(): CharacterData = when (this) {
    PasswordSpecialCharacters.ANY -> EnglishCharacterData.Special
    PasswordSpecialCharacters.ASCII -> EnglishCharacterData.SpecialAscii
    PasswordSpecialCharacters.LATIN -> EnglishCharacterData.SpecialLatin
    PasswordSpecialCharacters.UNICODE -> EnglishCharacterData.SpecialUnicode
}

internal fun PasswordAlphabet.lowerCase(): CharacterData = when (this) {
    PasswordAlphabet.ENGLISH -> EnglishCharacterData.LowerCase
    PasswordAlphabet.GERMAN -> GermanCharacterData.LowerCase
    PasswordAlphabet.CZECH -> CzechCharacterData.LowerCase
    PasswordAlphabet.POLISH -> PolishCharacterData.LowerCase
    PasswordAlphabet.CYRILLIC -> CyrillicCharacterData.LowerCase
    PasswordAlphabet.CYRILLIC_MODERN -> CyrillicModernCharacterData.LowerCase
}

internal fun PasswordAlphabet.upperCase(): CharacterData = when (this) {
    PasswordAlphabet.ENGLISH -> EnglishCharacterData.UpperCase
    PasswordAlphabet.GERMAN -> GermanCharacterData.UpperCase
    PasswordAlphabet.CZECH -> CzechCharacterData.UpperCase
    PasswordAlphabet.POLISH -> PolishCharacterData.UpperCase
    PasswordAlphabet.CYRILLIC -> CyrillicCharacterData.UpperCase
    PasswordAlphabet.CYRILLIC_MODERN -> CyrillicModernCharacterData.UpperCase
}

/**
 * "A letter of this alphabet", which Passay only ships ready-made for English - every other language
 * gives its lower and upper case sets separately, so the alphabetical set is their union. Carries
 * English's error code either way, which is what makes the message resolve.
 */
internal fun PasswordAlphabet.alphabetical(): CharacterData = when (this) {
    PasswordAlphabet.ENGLISH -> EnglishCharacterData.Alphabetical
    else -> object : CharacterData {
        override fun getErrorCode(): String = EnglishCharacterData.Alphabetical.errorCode

        override fun getCharacters(): String = lowerCase().characters + upperCase().characters
    }
}

internal fun PasswordAlphabet.alphabeticalSequence(): SequenceData = when (this) {
    PasswordAlphabet.ENGLISH -> EnglishSequenceData.Alphabetical
    PasswordAlphabet.GERMAN -> GermanSequenceData.Alphabetical
    PasswordAlphabet.CZECH -> CzechSequenceData.Alphabetical
    PasswordAlphabet.POLISH -> PolishSequenceData.Alphabetical
    PasswordAlphabet.CYRILLIC -> CyrillicSequenceData.Alphabetical
    PasswordAlphabet.CYRILLIC_MODERN -> CyrillicModernSequenceData.Alphabetical
}

/** Passay only ships keyboard layouts for English and German; there is nothing to check elsewhere. */
internal fun PasswordAlphabet.keyboardSequence(): SequenceData? = when (this) {
    PasswordAlphabet.ENGLISH -> EnglishSequenceData.USQwerty
    PasswordAlphabet.GERMAN -> GermanSequenceData.DEQwertz
    else -> null
}
