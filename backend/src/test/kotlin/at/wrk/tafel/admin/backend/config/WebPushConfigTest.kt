package at.wrk.tafel.admin.backend.config

import at.wrk.tafel.admin.backend.config.properties.TafelAdminProperties
import at.wrk.tafel.admin.backend.config.properties.TafelAdminPushProperties
import org.assertj.core.api.Assertions.assertThat
import org.junit.jupiter.api.Test

internal class WebPushConfigTest {

    private val config = WebPushConfig()

    @Test
    fun `pushService is null when push isn't configured at all`() {
        assertThat(config.pushService(TafelAdminProperties(push = null))).isNull()
    }

    @Test
    fun `pushService is null when the private key is missing`() {
        val properties = TafelAdminProperties(
            push = TafelAdminPushProperties(
                vapidPublicKey = "public-key",
                vapidPrivateKey = null,
                vapidSubject = "mailto:test@localhost",
            ),
        )

        assertThat(config.pushService(properties)).isNull()
    }

    @Test
    fun `pushService is null when the public key is missing`() {
        val properties = TafelAdminProperties(
            push = TafelAdminPushProperties(
                vapidPublicKey = null,
                vapidPrivateKey = "private-key",
                vapidSubject = "mailto:test@localhost",
            ),
        )

        assertThat(config.pushService(properties)).isNull()
    }

    @Test
    fun `pushService is null when the subject is missing`() {
        val properties = TafelAdminProperties(
            push = TafelAdminPushProperties(
                vapidPublicKey = "public-key",
                vapidPrivateKey = "private-key",
                vapidSubject = null,
            ),
        )

        assertThat(config.pushService(properties)).isNull()
    }
}
