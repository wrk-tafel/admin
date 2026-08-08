package at.wrk.tafel.admin.backend.modules.config.internal

import at.wrk.tafel.admin.backend.config.properties.ConfigurationReloadedEvent
import at.wrk.tafel.admin.backend.config.properties.TafelAdminProperties
import at.wrk.tafel.admin.backend.database.common.sseoutbox.SseOutboxService
import at.wrk.tafel.admin.backend.modules.config.ConfigResponse
import at.wrk.tafel.admin.backend.modules.config.toConfigResponse
import org.springframework.context.event.EventListener
import org.springframework.stereotype.Service

/**
 * Turns a reloaded backend configuration into the frontend's view of it and hands it to the SSE
 * outbox, from where `ConfigSseController` fans it out to every open session.
 *
 * The reload event fires for any change to the configuration - not just this application's own
 * settings, and certainly not just the handful the frontend is told about. Comparing against what
 * was last sent
 * keeps those from waking every open browser for nothing - and makes this the only place that has
 * to know what "a change the frontend cares about" means, rather than the reload service having to
 * know it too.
 */
@Service
class ConfigChangePublisher(
    private val tafelAdminProperties: TafelAdminProperties,
    private val sseOutboxService: SseOutboxService,
) {

    // Seeded with what a page load would get right now, so the first reload only notifies if it
    // really moved something the frontend can see.
    @Volatile
    private var lastPublishedConfig: ConfigResponse = tafelAdminProperties.toConfigResponse()

    @EventListener
    fun onConfigurationReloaded(event: ConfigurationReloadedEvent) {
        val currentConfig = tafelAdminProperties.toConfigResponse()
        if (currentConfig == lastPublishedConfig) {
            return
        }

        lastPublishedConfig = currentConfig
        sseOutboxService.saveOutboxEntry(NOTIFICATION_NAME, currentConfig)
    }

    companion object {
        const val NOTIFICATION_NAME = "config"
    }
}
