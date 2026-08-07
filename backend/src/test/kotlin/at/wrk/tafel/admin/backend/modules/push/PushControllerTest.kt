package at.wrk.tafel.admin.backend.modules.push

import at.wrk.tafel.admin.backend.modules.push.internal.PushPreferencesService
import at.wrk.tafel.admin.backend.modules.push.internal.PushSubscriptionService
import at.wrk.tafel.admin.backend.modules.push.model.PushMasterPreferenceRequest
import at.wrk.tafel.admin.backend.modules.push.model.PushNotificationType
import at.wrk.tafel.admin.backend.modules.push.model.PushNotificationTypePreferenceItem
import at.wrk.tafel.admin.backend.modules.push.model.PushPreferencesResponse
import at.wrk.tafel.admin.backend.modules.push.model.PushPublicKeyResponse
import at.wrk.tafel.admin.backend.modules.push.model.PushSubscriptionItem
import at.wrk.tafel.admin.backend.modules.push.model.PushSubscriptionLabelRequest
import at.wrk.tafel.admin.backend.modules.push.model.PushSubscriptionRequest
import at.wrk.tafel.admin.backend.modules.push.model.PushTestResponse
import at.wrk.tafel.admin.backend.modules.push.model.PushTestResult
import at.wrk.tafel.admin.backend.modules.push.model.PushTypePreferenceRequest
import io.mockk.every
import io.mockk.impl.annotations.InjectMockKs
import io.mockk.impl.annotations.RelaxedMockK
import io.mockk.junit5.MockKExtension
import io.mockk.verify
import org.assertj.core.api.Assertions.assertThat
import org.junit.jupiter.api.Test
import org.junit.jupiter.api.extension.ExtendWith
import org.springframework.http.HttpStatus
import java.time.LocalDateTime

@ExtendWith(MockKExtension::class)
internal class PushControllerTest {

    @RelaxedMockK
    private lateinit var pushSubscriptionService: PushSubscriptionService

    @RelaxedMockK
    private lateinit var pushPreferencesService: PushPreferencesService

    @InjectMockKs
    private lateinit var pushController: PushController

    @Test
    fun `getPublicKey delegates to the service`() {
        every { pushSubscriptionService.getPublicKey() } returns PushPublicKeyResponse(publicKey = "public-key")

        val response = pushController.getPublicKey()

        assertThat(response.publicKey).isEqualTo("public-key")
    }

    @Test
    fun `getSubscriptions wraps the service's list in a response`() {
        val items = listOf(
            PushSubscriptionItem(
                id = 1,
                endpoint = "https://push.example.com/x",
                userAgent = "Chrome",
                label = null,
                createdAt = LocalDateTime.now(),
            ),
        )
        every { pushSubscriptionService.getSubscriptionsForCurrentUser() } returns items

        val response = pushController.getSubscriptions()

        assertThat(response.items).isEqualTo(items)
    }

    @Test
    fun `createSubscription returns 201 with the created item`() {
        val request = PushSubscriptionRequest(endpoint = "https://push.example.com/x", p256dhKey = "p", authKey = "a")
        val created = PushSubscriptionItem(id = 1, endpoint = request.endpoint, userAgent = null, label = null, createdAt = LocalDateTime.now())
        every { pushSubscriptionService.createSubscription(request) } returns created

        val response = pushController.createSubscription(request)

        assertThat(response.statusCode).isEqualTo(HttpStatus.CREATED)
        assertThat(response.body).isEqualTo(created)
    }

    @Test
    fun `updateLabel delegates to the service`() {
        val request = PushSubscriptionLabelRequest(label = "Tafel 1")
        val updated = PushSubscriptionItem(
            id = 1,
            endpoint = "https://push.example.com/x",
            userAgent = null,
            label = "Tafel 1",
            createdAt = LocalDateTime.now(),
        )
        every { pushSubscriptionService.updateLabel(1L, request) } returns updated

        val response = pushController.updateLabel(1L, request)

        assertThat(response).isEqualTo(updated)
    }

    @Test
    fun `deleteSubscription returns 204 and delegates to the service`() {
        val response = pushController.deleteSubscription(5L)

        assertThat(response.statusCode).isEqualTo(HttpStatus.NO_CONTENT)
        verify { pushSubscriptionService.deleteSubscription(5L) }
    }

    @Test
    fun `sendTestNotification delegates to the service and returns its outcome`() {
        every { pushSubscriptionService.sendTestNotification(5L) } returns PushTestResponse(result = PushTestResult.NOT_CONFIGURED)

        val response = pushController.sendTestNotification(5L)

        assertThat(response.result).isEqualTo(PushTestResult.NOT_CONFIGURED)
        verify { pushSubscriptionService.sendTestNotification(5L) }
    }

    @Test
    fun `getPreferences delegates to the service`() {
        val preferences = PushPreferencesResponse(
            masterEnabled = true,
            types = listOf(PushNotificationTypePreferenceItem(type = PushNotificationType.DISTRIBUTION_STARTED, enabled = true)),
        )
        every { pushPreferencesService.getPreferencesForCurrentUser() } returns preferences

        val response = pushController.getPreferences()

        assertThat(response).isEqualTo(preferences)
    }

    @Test
    fun `updateMasterPreference delegates to the service`() {
        val request = PushMasterPreferenceRequest(enabled = false)
        val updated = PushPreferencesResponse(masterEnabled = false, types = emptyList())
        every { pushPreferencesService.updateMasterPreference(request) } returns updated

        val response = pushController.updateMasterPreference(request)

        assertThat(response).isEqualTo(updated)
    }

    @Test
    fun `updateTypePreference delegates to the service`() {
        val request = PushTypePreferenceRequest(enabled = false)
        val updated = PushPreferencesResponse(
            masterEnabled = true,
            types = listOf(PushNotificationTypePreferenceItem(type = PushNotificationType.DISTRIBUTION_CLOSED, enabled = false)),
        )
        every { pushPreferencesService.updateTypePreference(PushNotificationType.DISTRIBUTION_CLOSED, request) } returns updated

        val response = pushController.updateTypePreference(PushNotificationType.DISTRIBUTION_CLOSED, request)

        assertThat(response).isEqualTo(updated)
    }
}
