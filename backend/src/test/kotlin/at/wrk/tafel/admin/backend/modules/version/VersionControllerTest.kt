package at.wrk.tafel.admin.backend.modules.version

import at.wrk.tafel.admin.backend.config.properties.TafelAdminProperties
import org.assertj.core.api.Assertions.assertThat
import org.junit.jupiter.api.Test

class VersionControllerTest {

    @Test
    fun `get version`() {
        val controller = VersionController(
            TafelAdminProperties(version = "1.2.3", buildTime = "2026-07-28T15:30:00Z"),
        )

        val response = controller.getVersion()

        assertThat(response).isEqualTo(
            VersionResponse(version = "1.2.3", buildTime = "2026-07-28T15:30:00Z"),
        )
    }
}
