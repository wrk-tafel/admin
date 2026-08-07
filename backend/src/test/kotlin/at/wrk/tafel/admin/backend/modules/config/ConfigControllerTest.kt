package at.wrk.tafel.admin.backend.modules.config

import at.wrk.tafel.admin.backend.config.properties.TafelAdminProperties
import at.wrk.tafel.admin.backend.config.properties.TafelAdminStorageProperties
import org.assertj.core.api.Assertions.assertThat
import org.junit.jupiter.api.Test

class ConfigControllerTest {

    @Test
    fun `get config`() {
        val controller = ConfigController(
            TafelAdminProperties(
                version = "1.2.3",
                buildTime = "2026-07-28T15:30:00Z",
                storage = TafelAdminStorageProperties(scannerPath = "/mnt/scanner"),
            ),
        )

        val response = controller.getConfig()

        assertThat(response).isEqualTo(
            ConfigResponse(version = "1.2.3", buildTime = "2026-07-28T15:30:00Z", scannerFolderEnabled = true),
        )
    }

    @Test
    fun `get config reports the scanner folder as disabled when it is switched off`() {
        val controller = ConfigController(
            TafelAdminProperties(storage = TafelAdminStorageProperties(scannerPath = "/mnt/scanner", scannerEnabled = false)),
        )

        assertThat(controller.getConfig().scannerFolderEnabled).isFalse()
    }

    @Test
    fun `get config reports the scanner folder as disabled when no folder is configured`() {
        val controller = ConfigController(TafelAdminProperties())

        assertThat(controller.getConfig().scannerFolderEnabled).isFalse()
    }

    @Test
    fun `get public config returns the configured environment label`() {
        val controller = ConfigController(TafelAdminProperties(environmentLabel = " DEV "))

        assertThat(controller.getPublicConfig()).isEqualTo(PublicConfigResponse(environmentLabel = "DEV"))
    }

    @Test
    fun `get public config returns an empty environment label when none is configured`() {
        val controller = ConfigController(TafelAdminProperties())

        assertThat(controller.getPublicConfig()).isEqualTo(PublicConfigResponse(environmentLabel = ""))
    }
}
