package at.wrk.tafel.admin.backend.modules.push

import at.wrk.tafel.admin.backend.modules.push.internal.PushPreferencesService
import at.wrk.tafel.admin.backend.modules.push.internal.PushSubscriptionService
import at.wrk.tafel.admin.backend.modules.push.model.PushMasterPreferenceRequest
import at.wrk.tafel.admin.backend.modules.push.model.PushNotificationType
import at.wrk.tafel.admin.backend.modules.push.model.PushPreferencesResponse
import at.wrk.tafel.admin.backend.modules.push.model.PushPublicKeyResponse
import at.wrk.tafel.admin.backend.modules.push.model.PushSubscriptionItem
import at.wrk.tafel.admin.backend.modules.push.model.PushSubscriptionLabelRequest
import at.wrk.tafel.admin.backend.modules.push.model.PushSubscriptionListResponse
import at.wrk.tafel.admin.backend.modules.push.model.PushSubscriptionRequest
import at.wrk.tafel.admin.backend.modules.push.model.PushTypePreferenceRequest
import jakarta.validation.Valid
import org.springframework.http.HttpStatus
import org.springframework.http.ResponseEntity
import org.springframework.security.access.prepost.PreAuthorize
import org.springframework.web.bind.annotation.DeleteMapping
import org.springframework.web.bind.annotation.GetMapping
import org.springframework.web.bind.annotation.PathVariable
import org.springframework.web.bind.annotation.PostMapping
import org.springframework.web.bind.annotation.PutMapping
import org.springframework.web.bind.annotation.RequestBody
import org.springframework.web.bind.annotation.RequestMapping
import org.springframework.web.bind.annotation.RestController

/**
 * Any authenticated user may register/unregister their own device - subscribing here is itself
 * the opt-in. Whether a subscribed device actually receives a given push is then further gated by
 * that device owner's preferences (master switch plus per-type opt-out, see
 * `push.internal.PushPreferencesService`/`push.internal.PushBroadcastService`).
 */
@RestController
@RequestMapping("/api/push")
@PreAuthorize("isAuthenticated()")
class PushController(
    private val pushSubscriptionService: PushSubscriptionService,
    private val pushPreferencesService: PushPreferencesService,
) {

    @GetMapping("/public-key")
    fun getPublicKey(): PushPublicKeyResponse = pushSubscriptionService.getPublicKey()

    @GetMapping("/subscriptions")
    fun getSubscriptions(): PushSubscriptionListResponse = PushSubscriptionListResponse(items = pushSubscriptionService.getSubscriptionsForCurrentUser())

    @PostMapping("/subscriptions")
    fun createSubscription(@Valid @RequestBody request: PushSubscriptionRequest): ResponseEntity<PushSubscriptionItem> {
        val created = pushSubscriptionService.createSubscription(request)
        return ResponseEntity.status(HttpStatus.CREATED).body(created)
    }

    @PutMapping("/subscriptions/{id}/label")
    fun updateLabel(@PathVariable id: Long, @Valid @RequestBody request: PushSubscriptionLabelRequest): PushSubscriptionItem = pushSubscriptionService.updateLabel(id, request)

    @DeleteMapping("/subscriptions/{id}")
    fun deleteSubscription(@PathVariable id: Long): ResponseEntity<Void> {
        pushSubscriptionService.deleteSubscription(id)
        return ResponseEntity.noContent().build()
    }

    @GetMapping("/preferences")
    fun getPreferences(): PushPreferencesResponse = pushPreferencesService.getPreferencesForCurrentUser()

    @PutMapping("/preferences/master")
    fun updateMasterPreference(@RequestBody request: PushMasterPreferenceRequest): PushPreferencesResponse = pushPreferencesService.updateMasterPreference(request)

    @PutMapping("/preferences/types/{type}")
    fun updateTypePreference(@PathVariable type: PushNotificationType, @RequestBody request: PushTypePreferenceRequest): PushPreferencesResponse = pushPreferencesService.updateTypePreference(type, request)
}
