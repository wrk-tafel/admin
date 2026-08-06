package at.wrk.tafel.admin.backend.modules.push

import at.wrk.tafel.admin.backend.modules.push.internal.PushSubscriptionService
import at.wrk.tafel.admin.backend.modules.push.model.PushPublicKeyResponse
import at.wrk.tafel.admin.backend.modules.push.model.PushSubscriptionItem
import at.wrk.tafel.admin.backend.modules.push.model.PushSubscriptionListResponse
import at.wrk.tafel.admin.backend.modules.push.model.PushSubscriptionRequest
import jakarta.validation.Valid
import org.springframework.http.HttpStatus
import org.springframework.http.ResponseEntity
import org.springframework.security.access.prepost.PreAuthorize
import org.springframework.web.bind.annotation.DeleteMapping
import org.springframework.web.bind.annotation.GetMapping
import org.springframework.web.bind.annotation.PathVariable
import org.springframework.web.bind.annotation.PostMapping
import org.springframework.web.bind.annotation.RequestBody
import org.springframework.web.bind.annotation.RequestMapping
import org.springframework.web.bind.annotation.RestController

/**
 * Any authenticated user may register/unregister their own device - subscribing here is itself
 * the opt-in, every subscribed device receives every push (see `push.internal.PushBroadcastService`).
 */
@RestController
@RequestMapping("/api/push")
@PreAuthorize("isAuthenticated()")
class PushController(
    private val pushSubscriptionService: PushSubscriptionService,
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

    @DeleteMapping("/subscriptions/{id}")
    fun deleteSubscription(@PathVariable id: Long): ResponseEntity<Void> {
        pushSubscriptionService.deleteSubscription(id)
        return ResponseEntity.noContent().build()
    }
}
