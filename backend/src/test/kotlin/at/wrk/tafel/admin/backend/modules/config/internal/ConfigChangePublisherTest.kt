package at.wrk.tafel.admin.backend.modules.config.internal

import at.wrk.tafel.admin.backend.config.properties.ConfigurationReloadedEvent
import at.wrk.tafel.admin.backend.config.properties.TafelAdminProperties
import at.wrk.tafel.admin.backend.database.common.sseoutbox.SseOutboxService
import at.wrk.tafel.admin.backend.modules.config.ConfigResponse
import at.wrk.tafel.admin.backend.modules.config.PasswordRules
import io.mockk.confirmVerified
import io.mockk.impl.annotations.RelaxedMockK
import io.mockk.junit5.MockKExtension
import io.mockk.verifySequence
import org.junit.jupiter.api.Test
import org.junit.jupiter.api.extension.ExtendWith

@ExtendWith(MockKExtension::class)
internal class ConfigChangePublisherTest {

    @RelaxedMockK
    private lateinit var sseOutboxService: SseOutboxService

    private val properties = TafelAdminProperties().apply {
        version = "1.2.3"
        buildTime = "2026-07-28T15:30:00Z"
        storage.scannerPath = "/mnt/scanner"
    }

    private val defaultPasswordRules = PasswordRules(
        minLength = 8,
        maxLength = 50,
        descriptions = listOf(
            "Mindestens 8 Zeichen, maximal 50 Zeichen",
            "Der Benutzername darf nicht Teil des Passworts sein",
            "Keine Leerzeichen",
        ),
    )

    private val changedEvent = ConfigurationReloadedEvent(setOf("tafeladmin.features.scannerFolderEnabled"))

    @Test
    fun `publishes the frontend's view of the reloaded configuration`() {
        val publisher = ConfigChangePublisher(properties, sseOutboxService)
        properties.features.scannerFolderEnabled = false

        publisher.onConfigurationReloaded(changedEvent)

        verifySequence {
            sseOutboxService.saveOutboxEntry(
                ConfigChangePublisher.NOTIFICATION_NAME,
                ConfigResponse(version = "1.2.3", buildTime = "2026-07-28T15:30:00Z", scannerFolderEnabled = false, passwordRules = defaultPasswordRules),
            )
        }
    }

    /**
     * The password-change screen validates against these and lists them, so an operator tightening
     * the rules has to reach a page that is already open rather than only the next page load.
     */
    @Test
    fun `publishes changed password rules`() {
        val publisher = ConfigChangePublisher(properties, sseOutboxService)
        properties.password.minLength = 12
        properties.password.dictionary.forbiddenWords = listOf("tafel")

        publisher.onConfigurationReloaded(changedEvent)

        verifySequence {
            sseOutboxService.saveOutboxEntry(
                ConfigChangePublisher.NOTIFICATION_NAME,
                ConfigResponse(
                    version = "1.2.3",
                    buildTime = "2026-07-28T15:30:00Z",
                    scannerFolderEnabled = true,
                    passwordRules = PasswordRules(
                        minLength = 12,
                        maxLength = 50,
                        descriptions = listOf(
                            "Mindestens 12 Zeichen, maximal 50 Zeichen",
                            "Folgende Wörter sind nicht erlaubt: tafel",
                            "Der Benutzername darf nicht Teil des Passworts sein",
                            "Keine Leerzeichen",
                        ),
                    ),
                ),
            )
        }
    }

    /**
     * A reload of settings the frontend is never told about (mail, tokens, storage paths) must not
     * wake every open browser for a config that reads identically to the one it already has.
     */
    @Test
    fun `stays quiet when the reload changed nothing the frontend can see`() {
        val publisher = ConfigChangePublisher(properties, sseOutboxService)
        properties.storage.documentsPath = "/somewhere/else"

        publisher.onConfigurationReloaded(changedEvent)

        confirmVerified(sseOutboxService)
    }

    @Test
    fun `publishes again only when the frontend's view changes again`() {
        val publisher = ConfigChangePublisher(properties, sseOutboxService)

        properties.features.scannerFolderEnabled = false
        publisher.onConfigurationReloaded(changedEvent)
        publisher.onConfigurationReloaded(changedEvent)
        properties.features.scannerFolderEnabled = true
        publisher.onConfigurationReloaded(changedEvent)

        verifySequence {
            sseOutboxService.saveOutboxEntry(
                ConfigChangePublisher.NOTIFICATION_NAME,
                ConfigResponse(version = "1.2.3", buildTime = "2026-07-28T15:30:00Z", scannerFolderEnabled = false, passwordRules = defaultPasswordRules),
            )
            sseOutboxService.saveOutboxEntry(
                ConfigChangePublisher.NOTIFICATION_NAME,
                ConfigResponse(version = "1.2.3", buildTime = "2026-07-28T15:30:00Z", scannerFolderEnabled = true, passwordRules = defaultPasswordRules),
            )
        }
    }
}
