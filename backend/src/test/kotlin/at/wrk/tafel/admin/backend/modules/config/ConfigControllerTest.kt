package at.wrk.tafel.admin.backend.modules.config

import at.wrk.tafel.admin.backend.config.properties.TafelAdminProperties
import org.assertj.core.api.Assertions.assertThat
import org.junit.jupiter.api.Test

class ConfigControllerTest {

    private val defaultPasswordRules = PasswordRules(
        minLength = 8,
        maxLength = 50,
        descriptions = listOf(
            "Mindestens 8 Zeichen, maximal 50 Zeichen",
            "Der Benutzername darf nicht Teil des Passworts sein",
            "Keine Leerzeichen",
        ),
    )

    @Test
    fun `get config`() {
        val controller = ConfigController(
            TafelAdminProperties().apply {
                version = "1.2.3"
                buildTime = "2026-07-28T15:30:00Z"
                storage.scannerPath = "/mnt/scanner"
            },
        )

        val response = controller.getConfig()

        assertThat(response).isEqualTo(
            ConfigResponse(version = "1.2.3", buildTime = "2026-07-28T15:30:00Z", scannerFolderEnabled = true, passwordRules = defaultPasswordRules),
        )
    }

    @Test
    fun `get config reports the scanner folder as disabled when it is switched off`() {
        val controller = ConfigController(
            TafelAdminProperties().apply {
                storage.scannerPath = "/mnt/scanner"
                features.scannerFolderEnabled = false
            },
        )

        assertThat(controller.getConfig().scannerFolderEnabled).isFalse()
    }

    @Test
    fun `get config reports the scanner folder as disabled when no folder is configured`() {
        val controller = ConfigController(TafelAdminProperties())

        assertThat(controller.getConfig().scannerFolderEnabled).isFalse()
    }

    /**
     * The whole point of reading the properties per request: a config file edit was re-bound into
     * the very instance this controller holds (see `ConfigFileReloadService`), and the next request
     * has to answer with the new values rather than the ones that were there at startup.
     */
    @Test
    fun `get config answers with reloaded configuration`() {
        val properties = TafelAdminProperties().apply { version = "1.2.3" }
        val controller = ConfigController(properties)
        assertThat(controller.getConfig().scannerFolderEnabled).isFalse()

        properties.storage.scannerPath = "/mnt/scanner"

        assertThat(controller.getConfig()).isEqualTo(
            ConfigResponse(version = "1.2.3", buildTime = "unknown", scannerFolderEnabled = true, passwordRules = defaultPasswordRules),
        )
    }

    /**
     * The length limits are what the form validates against itself; the descriptions are the whole
     * configured policy in the wording the screen lists (see `PasswordRuleDescriptions`).
     */
    @Test
    fun `get config reports the configured password rules`() {
        val controller = ConfigController(
            TafelAdminProperties().apply {
                password.minLength = 12
                password.maxLength = 30
                password.dictionary.forbiddenWords = listOf("tafel", "wrk")
                password.characters.minDigits = 1
            },
        )

        assertThat(controller.getConfig().passwordRules).isEqualTo(
            PasswordRules(
                minLength = 12,
                maxLength = 30,
                descriptions = listOf(
                    "Mindestens 12 Zeichen, maximal 30 Zeichen",
                    "Mindestens 1 Ziffer",
                    "Folgende Wörter sind nicht erlaubt: tafel, wrk",
                    "Der Benutzername darf nicht Teil des Passworts sein",
                    "Keine Leerzeichen",
                ),
            ),
        )
    }

    @Test
    fun `get public config returns the configured environment label`() {
        val controller = ConfigController(TafelAdminProperties().apply { environmentLabel = " DEV " })

        assertThat(controller.getPublicConfig()).isEqualTo(PublicConfigResponse(environmentLabel = "DEV"))
    }

    @Test
    fun `get public config returns an empty environment label when none is configured`() {
        val controller = ConfigController(TafelAdminProperties())

        assertThat(controller.getPublicConfig()).isEqualTo(PublicConfigResponse(environmentLabel = ""))
    }
}
