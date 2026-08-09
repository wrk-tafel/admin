package at.wrk.tafel.admin.backend.common.auth.components

import at.wrk.tafel.admin.backend.config.properties.PasswordMatchBehavior
import at.wrk.tafel.admin.backend.config.properties.TafelAdminPasswordProperties
import at.wrk.tafel.admin.backend.config.properties.TafelAdminPasswordSequenceProperties

/**
 * The configured password policy as German sentences, one per active rule - what the
 * password-change screen lists so a user knows the rules before being rejected by them.
 *
 * Built in the backend rather than in the frontend because the policy is open-ended: with every
 * Passay rule configurable (see [TafelAdminPasswordProperties]), a frontend writing its own
 * sentences would need its own copy of what each setting means, and would silently stop mentioning
 * whatever it hadn't been taught about. Here the descriptions sit next to the code that assembles
 * the rules ([TafelPasswordValidator]), which is what keeps the two in step - and this application
 * is German-only, so there is no locale to negotiate. `/api/config` carries the finished list.
 */
object PasswordRuleDescriptions {

    fun of(properties: TafelAdminPasswordProperties): List<String> = buildList {
        add("Mindestens ${properties.minLength} Zeichen, maximal ${properties.maxLength} Zeichen")
        addAll(characterDescriptions(properties))
        addAll(dictionaryDescriptions(properties))

        if (properties.username.enabled) {
            add(usernameDescription(properties))
        }
        if (properties.whitespace.enabled) {
            add(
                when (properties.whitespace.matchBehavior) {
                    PasswordMatchBehavior.CONTAINS -> "Keine Leerzeichen"
                    PasswordMatchBehavior.STARTS_WITH -> "Darf nicht mit einem Leerzeichen beginnen"
                    PasswordMatchBehavior.ENDS_WITH -> "Darf nicht mit einem Leerzeichen enden"
                },
            )
        }

        sequenceDescription(properties.sequences.alphabetical, "Buchstabenfolgen", "abcde")?.let { add(it) }
        sequenceDescription(properties.sequences.numerical, "Zahlenfolgen", "12345")?.let { add(it) }
        // Only under an alphabet Passay has a keyboard layout for - otherwise no rule is applied
        // either, and describing one would state a rule that isn't enforced.
        properties.alphabet.keyboardSequence()?.let {
            sequenceDescription(properties.sequences.keyboard, "Tastaturfolgen", "qwert")?.let { description -> add(description) }
        }

        if (properties.repeatedCharacters.enabled) {
            add(repeatedCharactersDescription(properties))
        }
        if (properties.maxCharacterOccurrences > 0) {
            add("Kein Zeichen darf öfter als ${properties.maxCharacterOccurrences} mal vorkommen")
        }
        properties.allowedCharacters?.takeIf { it.isNotEmpty() }?.let {
            add("Nur folgende Zeichen sind erlaubt: $it")
        }
        properties.illegalCharacters?.takeIf { it.isNotEmpty() }?.let {
            add("Folgende Zeichen sind nicht erlaubt: $it")
        }
        properties.allowedPatterns.filter { it.isNotBlank() }.forEach {
            add("Muss dem Muster \"$it\" entsprechen")
        }
        properties.illegalPatterns.filter { it.isNotBlank() }.forEach {
            add("Darf dem Muster \"$it\" nicht entsprechen")
        }
        properties.illegalNumberRanges.forEach {
            add("Die Zahlen von ${it.lower} bis ${it.upper} dürfen nicht enthalten sein")
        }
    }

    private fun characterDescriptions(properties: TafelAdminPasswordProperties): List<String> {
        val characters = properties.characters
        val classes = listOfNotNull(
            characterClass(characters.minLowerCase, "Kleinbuchstabe", "Kleinbuchstaben"),
            characterClass(characters.minUpperCase, "Großbuchstabe", "Großbuchstaben"),
            characterClass(characters.minDigits, "Ziffer", "Ziffern"),
            characterClass(characters.minSpecial, "Sonderzeichen", "Sonderzeichen"),
            characterClass(characters.minAlphabetical, "Buchstabe", "Buchstaben"),
        )

        if (classes.isEmpty()) {
            return emptyList()
        }
        if (characters.minTypes <= 0) {
            return classes.map { "Mindestens $it" }
        }
        // Mirrors the cap in TafelPasswordValidator: more required than configured is impossible.
        val required = characters.minTypes.coerceAtMost(classes.size)
        return listOf("Mindestens $required der folgenden Anforderungen: ${classes.joinToString(", ")}")
    }

    private fun characterClass(minimum: Int, singular: String, plural: String): String? = minimum
        .takeIf { it > 0 }
        ?.let { "$it ${if (it == 1) singular else plural}" }

    private fun dictionaryDescriptions(properties: TafelAdminPasswordProperties): List<String> {
        val dictionary = properties.dictionary
        return buildList {
            dictionary.forbiddenWords.filter { it.isNotBlank() }.takeIf { it.isNotEmpty() }?.let {
                add("Folgende Wörter sind nicht erlaubt: ${it.joinToString(", ")}")
            }
            // Deliberately not listed one by one: this list is meant for whole passwords and is
            // typically a long list of common ones, which would swamp the rules panel.
            dictionary.forbiddenPasswords.filter { it.isNotBlank() }.takeIf { it.isNotEmpty() }?.let {
                add("Häufig verwendete Passwörter sind nicht erlaubt")
            }
        }
    }

    private fun usernameDescription(properties: TafelAdminPasswordProperties): String {
        val username = properties.username
        val backwards = if (username.matchBackwards) " (auch rückwärts)" else ""
        return when (username.matchBehavior) {
            PasswordMatchBehavior.CONTAINS -> "Der Benutzername darf nicht Teil des Passworts sein$backwards"
            PasswordMatchBehavior.STARTS_WITH -> "Darf nicht mit dem Benutzernamen beginnen$backwards"
            PasswordMatchBehavior.ENDS_WITH -> "Darf nicht mit dem Benutzernamen enden$backwards"
        }
    }

    private fun sequenceDescription(properties: TafelAdminPasswordSequenceProperties, kind: String, example: String): String? = properties
        .takeIf { it.enabled }
        ?.let { "Keine $kind mit ${it.length} oder mehr Zeichen (z. B. $example)" }

    private fun repeatedCharactersDescription(properties: TafelAdminPasswordProperties): String {
        val repeated = properties.repeatedCharacters
        return if (repeated.sequenceCount > 1) {
            "Höchstens ${repeated.sequenceCount - 1} Folgen von ${repeated.length} oder mehr gleichen Zeichen"
        } else {
            "Keine ${repeated.length} oder mehr gleichen Zeichen hintereinander"
        }
    }
}
