package at.wrk.tafel.admin.backend.modules.config

import at.wrk.tafel.admin.backend.config.properties.TafelAdminProperties
import org.assertj.core.api.Assertions.assertThat
import org.junit.jupiter.api.Test

class ConfigControllerTest {

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
            ConfigResponse(
                version = "1.2.3",
                buildTime = "2026-07-28T15:30:00Z",
                scannerFolderEnabled = true,
                environmentLabel = "",
            ),
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
            ConfigResponse(
                version = "1.2.3",
                buildTime = "unknown",
                scannerFolderEnabled = true,
                environmentLabel = "",
            ),
        )
    }

    @Test
    fun `get config trims and reports the configured environment label`() {
        val controller = ConfigController(TafelAdminProperties().apply { environmentLabel = " DEV " })

        assertThat(controller.getConfig().environmentLabel).isEqualTo("DEV")
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
