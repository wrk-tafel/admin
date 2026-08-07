package at.wrk.tafel.admin.backend.modules.config.internal

import at.wrk.tafel.admin.backend.config.properties.ConfigurationReloadedEvent
import at.wrk.tafel.admin.backend.config.properties.TafelAdminProperties
import at.wrk.tafel.admin.backend.database.common.sseoutbox.SseOutboxService
import at.wrk.tafel.admin.backend.modules.config.ConfigResponse
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

    private val changedEvent = ConfigurationReloadedEvent(setOf("tafeladmin.storage.scannerEnabled"))

    @Test
    fun `publishes the frontend's view of the reloaded configuration`() {
        val publisher = ConfigChangePublisher(properties, sseOutboxService)
        properties.storage.scannerEnabled = false

        publisher.onConfigurationReloaded(changedEvent)

        verifySequence {
            sseOutboxService.saveOutboxEntry(
                ConfigChangePublisher.NOTIFICATION_NAME,
                ConfigResponse(version = "1.2.3", buildTime = "2026-07-28T15:30:00Z", scannerFolderEnabled = false),
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

        properties.storage.scannerEnabled = false
        publisher.onConfigurationReloaded(changedEvent)
        publisher.onConfigurationReloaded(changedEvent)
        properties.storage.scannerEnabled = true
        publisher.onConfigurationReloaded(changedEvent)

        verifySequence {
            sseOutboxService.saveOutboxEntry(
                ConfigChangePublisher.NOTIFICATION_NAME,
                ConfigResponse(version = "1.2.3", buildTime = "2026-07-28T15:30:00Z", scannerFolderEnabled = false),
            )
            sseOutboxService.saveOutboxEntry(
                ConfigChangePublisher.NOTIFICATION_NAME,
                ConfigResponse(version = "1.2.3", buildTime = "2026-07-28T15:30:00Z", scannerFolderEnabled = true),
            )
        }
    }
}
