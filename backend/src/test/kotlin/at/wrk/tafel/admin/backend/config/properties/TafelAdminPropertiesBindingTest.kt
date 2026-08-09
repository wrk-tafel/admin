package at.wrk.tafel.admin.backend.config.properties

import org.assertj.core.api.Assertions.assertThat
import org.junit.jupiter.api.Test
import org.springframework.boot.context.properties.bind.Binder
import org.springframework.boot.env.YamlPropertySourceLoader
import org.springframework.core.env.StandardEnvironment
import org.springframework.core.io.FileSystemResource

/**
 * Binds the shipped `application.yml` to [TafelAdminProperties] the way the application does at
 * startup.
 *
 * The password policy is a deep, mostly optional structure, so a mistyped or misplaced key there is
 * exactly the kind of mistake that binds to nothing, silently drops the rule and is only noticed by
 * someone whose password should have been rejected. Nothing else in the unit tests reads the real
 * configuration file - they all build properties in code.
 */
internal class TafelAdminPropertiesBindingTest {

    private fun bindShippedConfiguration(): TafelAdminProperties {
        val environment = StandardEnvironment()
        YamlPropertySourceLoader()
            .load("application.yml", shippedConfigurationFile())
            .forEach { environment.propertySources.addLast(it) }

        return Binder.get(environment).bind("tafeladmin", TafelAdminProperties::class.java).get()
    }

    /**
     * Read from disk rather than from the classpath: `src/test/resources/application.yml` shadows
     * the shipped one there, and that test file is exactly what this must not be looking at.
     */
    private fun shippedConfigurationFile(): FileSystemResource = listOf(
        // the test task's working directory is the backend module, but don't rely on it alone
        "src/main/resources/application.yml",
        "backend/src/main/resources/application.yml",
    )
        .map { FileSystemResource(it) }
        .firstOrNull { it.exists() }
        ?: error("application.yml not found relative to ${System.getProperty("user.dir")}")

    @Test
    fun `the shipped password policy binds as configured`() {
        val password = bindShippedConfiguration().password

        assertThat(password.minLength).isEqualTo(8)
        assertThat(password.maxLength).isEqualTo(50)
        assertThat(password.alphabet).isEqualTo(PasswordAlphabet.GERMAN)
        assertThat(password.dictionary.forbiddenWords)
            .containsExactly("wrk", "örk", "oerk", "tafel", "roteskreuz", "toet", "töt", "1030")
    }

    /**
     * Everything this deployment doesn't switch on has to come out of the file as "off", not as an
     * accidentally enabled rule - the commented-out sections in `application.yml` are documentation,
     * not configuration.
     */
    @Test
    fun `rules this deployment does not use stay switched off`() {
        val password = bindShippedConfiguration().password

        assertThat(password.username.enabled).isTrue()
        assertThat(password.whitespace.enabled).isTrue()
        assertThat(password.dictionary.forbiddenPasswords).isEmpty()
        assertThat(password.characters.minLowerCase).isZero()
        assertThat(password.characters.minUpperCase).isZero()
        assertThat(password.characters.minDigits).isZero()
        assertThat(password.characters.minSpecial).isZero()
        assertThat(password.characters.minAlphabetical).isZero()
        assertThat(password.characters.minTypes).isZero()
        assertThat(password.sequences.alphabetical.enabled).isFalse()
        assertThat(password.sequences.numerical.enabled).isFalse()
        assertThat(password.sequences.keyboard.enabled).isFalse()
        assertThat(password.repeatedCharacters.enabled).isFalse()
        assertThat(password.maxCharacterOccurrences).isZero()
        assertThat(password.allowedCharacters).isNull()
        assertThat(password.illegalCharacters).isNull()
        assertThat(password.allowedPatterns).isEmpty()
        assertThat(password.illegalPatterns).isEmpty()
        assertThat(password.illegalNumberRanges).isEmpty()
    }
}
