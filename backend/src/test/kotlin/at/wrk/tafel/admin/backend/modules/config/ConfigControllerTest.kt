package at.wrk.tafel.admin.backend.modules.config

import at.wrk.tafel.admin.backend.config.properties.ApplicationProperties
import at.wrk.tafel.admin.backend.config.properties.SecurityJwtTokenProperties
import at.wrk.tafel.admin.backend.config.properties.SecurityJwtTokenSecretProperties
import at.wrk.tafel.admin.backend.config.properties.SecurityLoginAttemptsProperties
import at.wrk.tafel.admin.backend.config.properties.SecurityProperties
import at.wrk.tafel.admin.backend.config.properties.TafelAdminProperties
import org.assertj.core.api.Assertions.assertThat
import org.junit.jupiter.api.Test

class ConfigControllerTest {

    private fun applicationProperties(lockoutDurationInSeconds: Long = 300) = ApplicationProperties(
        security = SecurityProperties(
            jwtToken = SecurityJwtTokenProperties(
                issuer = "test",
                audience = "test",
                secret = SecurityJwtTokenSecretProperties(value = "secret", algorithm = "HMACSHA256"),
                expirationTimeInSeconds = 3600,
                expirationTimePwdChangeInSeconds = 300,
            ),
            loginAttempts = SecurityLoginAttemptsProperties(lockoutDurationInSeconds = lockoutDurationInSeconds),
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
            applicationProperties(),
        )

        val response = controller.getConfig()

        assertThat(response).isEqualTo(
            ConfigResponse(version = "1.2.3", buildTime = "2026-07-28T15:30:00Z", scannerFolderEnabled = true),
        )
    }

    @Test
    fun `get config reports the scanner folder as disabled when it is switched off`() {
        val controller = ConfigController(
            TafelAdminProperties().apply {
                storage.scannerPath = "/mnt/scanner"
                features.scannerFolderEnabled = false
            },
            applicationProperties(),
        )

        assertThat(controller.getConfig().scannerFolderEnabled).isFalse()
    }

    @Test
    fun `get config reports the scanner folder as disabled when no folder is configured`() {
        val controller = ConfigController(TafelAdminProperties(), applicationProperties())

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
        val controller = ConfigController(properties, applicationProperties())
        assertThat(controller.getConfig().scannerFolderEnabled).isFalse()

        properties.storage.scannerPath = "/mnt/scanner"

        assertThat(controller.getConfig()).isEqualTo(
            ConfigResponse(version = "1.2.3", buildTime = "unknown", scannerFolderEnabled = true),
        )
    }

    @Test
    fun `get public config returns the configured environment label`() {
        val controller = ConfigController(
            TafelAdminProperties().apply { environmentLabel = " DEV " },
            applicationProperties(lockoutDurationInSeconds = 300),
        )

        assertThat(controller.getPublicConfig()).isEqualTo(
            PublicConfigResponse(environmentLabel = "DEV", accountLockoutDurationInSeconds = 300),
        )
    }

    @Test
    fun `get public config returns an empty environment label when none is configured`() {
        val controller = ConfigController(TafelAdminProperties(), applicationProperties(lockoutDurationInSeconds = 900))

        assertThat(controller.getPublicConfig()).isEqualTo(
            PublicConfigResponse(environmentLabel = "", accountLockoutDurationInSeconds = 900),
        )
    }
}
