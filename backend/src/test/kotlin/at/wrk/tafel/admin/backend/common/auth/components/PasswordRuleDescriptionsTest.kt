package at.wrk.tafel.admin.backend.common.auth.components

import at.wrk.tafel.admin.backend.config.properties.PasswordAlphabet
import at.wrk.tafel.admin.backend.config.properties.PasswordMatchBehavior
import at.wrk.tafel.admin.backend.config.properties.TafelAdminPasswordNumberRangeProperties
import at.wrk.tafel.admin.backend.config.properties.TafelAdminPasswordProperties
import at.wrk.tafel.admin.backend.config.properties.TafelAdminProperties
import org.assertj.core.api.Assertions.assertThat
import org.junit.jupiter.api.Test

internal class PasswordRuleDescriptionsTest {

    private val properties = TafelAdminPasswordProperties()

    private fun descriptions(): List<String> = PasswordRuleDescriptions.of(properties)

    @Test
    fun `describes the rules a default configuration applies`() {
        assertThat(descriptions()).containsExactly(
            "Mindestens 8 Zeichen, maximal 50 Zeichen",
            "Der Benutzername darf nicht Teil des Passworts sein",
            "Keine Leerzeichen",
        )
    }

    @Test
    fun `describes the configured length`() {
        properties.minLength = 12
        properties.maxLength = 30

        assertThat(descriptions()).first().isEqualTo("Mindestens 12 Zeichen, maximal 30 Zeichen")
    }

    @Test
    fun `describes forbidden words but not forbidden passwords one by one`() {
        properties.dictionary.forbiddenWords = listOf("tafel", "wrk")
        properties.dictionary.forbiddenPasswords = listOf("passwort1", "passwort2")

        assertThat(descriptions()).contains(
            "Folgende Wörter sind nicht erlaubt: tafel, wrk",
            "Häufig verwendete Passwörter sind nicht erlaubt",
        )
        assertThat(descriptions()).noneMatch { it.contains("passwort1") }
    }

    @Test
    fun `describes each configured character class in the singular or plural`() {
        properties.characters.minLowerCase = 1
        properties.characters.minUpperCase = 2
        properties.characters.minDigits = 1
        properties.characters.minSpecial = 3

        assertThat(descriptions()).contains(
            "Mindestens 1 Kleinbuchstabe",
            "Mindestens 2 Großbuchstaben",
            "Mindestens 1 Ziffer",
            "Mindestens 3 Sonderzeichen",
        )
    }

    @Test
    fun `describes minTypes as a choice between the character classes`() {
        properties.characters.minLowerCase = 1
        properties.characters.minUpperCase = 1
        properties.characters.minDigits = 1
        properties.characters.minTypes = 2

        assertThat(descriptions()).contains(
            "Mindestens 2 der folgenden Anforderungen: 1 Kleinbuchstabe, 1 Großbuchstabe, 1 Ziffer",
        )
    }

    @Test
    fun `describes the username rule as configured`() {
        properties.username.matchBehavior = PasswordMatchBehavior.STARTS_WITH
        properties.username.matchBackwards = true

        assertThat(descriptions()).contains("Darf nicht mit dem Benutzernamen beginnen (auch rückwärts)")

        properties.username.enabled = false

        assertThat(descriptions()).noneMatch { it.contains("Benutzername") }
    }

    @Test
    fun `describes the sequence rules that are switched on`() {
        properties.sequences.alphabetical.enabled = true
        properties.sequences.numerical.enabled = true
        properties.sequences.numerical.length = 4

        assertThat(descriptions()).contains(
            "Keine Buchstabenfolgen mit 5 oder mehr Zeichen (z. B. abcde)",
            "Keine Zahlenfolgen mit 4 oder mehr Zeichen (z. B. 12345)",
        )
        assertThat(descriptions()).noneMatch { it.contains("Tastaturfolgen") }
    }

    /**
     * Passay has no keyboard layout outside English and German, so no rule is applied there either -
     * describing one would state a rule that nothing enforces.
     */
    @Test
    fun `does not describe keyboard sequences under an alphabet without a layout`() {
        properties.sequences.keyboard.enabled = true

        assertThat(descriptions()).anyMatch { it.contains("Tastaturfolgen") }

        properties.alphabet = PasswordAlphabet.POLISH

        assertThat(descriptions()).noneMatch { it.contains("Tastaturfolgen") }
    }

    @Test
    fun `describes the remaining rules that are switched on`() {
        properties.repeatedCharacters.enabled = true
        properties.repeatedCharacters.length = 3
        properties.maxCharacterOccurrences = 2
        properties.allowedCharacters = "abc"
        properties.illegalCharacters = "%$"
        properties.allowedPatterns = listOf(".*\\d.*")
        properties.illegalPatterns = listOf("aaa")
        properties.illegalNumberRanges = listOf(
            TafelAdminPasswordNumberRangeProperties().apply {
                lower = 1900
                upper = 2100
            },
        )

        assertThat(descriptions()).contains(
            "Keine 3 oder mehr gleichen Zeichen hintereinander",
            "Kein Zeichen darf öfter als 2 mal vorkommen",
            "Nur folgende Zeichen sind erlaubt: abc",
            "Folgende Zeichen sind nicht erlaubt: %$",
            "Muss dem Muster \".*\\d.*\" entsprechen",
            "Darf dem Muster \"aaa\" nicht entsprechen",
            "Die Zahlen von 1900 bis 2100 dürfen nicht enthalten sein",
        )
    }

    /**
     * The screen must not promise a rule the backend doesn't apply, nor stay silent about one it
     * does. Both sides walk the same configuration and produce exactly one entry per rule, so their
     * counts have to agree - which is what catches a rule added to one walk and forgotten in the
     * other.
     */
    @Test
    fun `describes exactly as many rules as the validator assembles`() {
        val configurations = listOf<TafelAdminPasswordProperties.() -> Unit>(
            { },
            {
                username.enabled = false
                whitespace.enabled = false
            },
            {
                characters.minLowerCase = 1
                characters.minUpperCase = 1
                characters.minDigits = 1
                characters.minSpecial = 1
                characters.minAlphabetical = 1
            },
            {
                characters.minLowerCase = 1
                characters.minDigits = 1
                characters.minTypes = 2
            },
            {
                dictionary.forbiddenWords = listOf("tafel")
                dictionary.forbiddenPasswords = listOf("passwort1")
                sequences.alphabetical.enabled = true
                sequences.numerical.enabled = true
                sequences.keyboard.enabled = true
                repeatedCharacters.enabled = true
                maxCharacterOccurrences = 3
                allowedCharacters = "abc"
                illegalCharacters = "%"
                allowedPatterns = listOf(".*\\d.*", ".*[A-Z].*")
                illegalPatterns = listOf("aaa")
                illegalNumberRanges = listOf(
                    TafelAdminPasswordNumberRangeProperties().apply {
                        lower = 1900
                        upper = 2100
                    },
                )
            },
        )

        configurations.forEach { configure ->
            val passwordProperties = TafelAdminPasswordProperties().apply(configure)
            val allProperties = TafelAdminProperties().apply { password = passwordProperties }

            assertThat(PasswordRuleDescriptions.of(passwordProperties))
                .hasSameSizeAs(TafelPasswordValidator(allProperties).currentRules())
        }
    }
}
