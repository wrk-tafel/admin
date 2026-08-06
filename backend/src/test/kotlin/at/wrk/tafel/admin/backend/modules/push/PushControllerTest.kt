package at.wrk.tafel.admin.backend.modules.push

import at.wrk.tafel.admin.backend.modules.push.internal.PushSubscriptionService
import at.wrk.tafel.admin.backend.modules.push.model.PushPublicKeyResponse
import at.wrk.tafel.admin.backend.modules.push.model.PushSubscriptionItem
import at.wrk.tafel.admin.backend.modules.push.model.PushSubscriptionRequest
import io.mockk.every
import io.mockk.impl.annotations.InjectMockKs
import io.mockk.impl.annotations.RelaxedMockK
import io.mockk.junit5.MockKExtension
import io.mockk.verify
import org.assertj.core.api.Assertions.assertThat
import org.junit.jupiter.api.Test
import org.junit.jupiter.api.extension.ExtendWith
import org.springframework.http.HttpStatus

@ExtendWith(MockKExtension::class)
internal class PushControllerTest {

    @RelaxedMockK
    private lateinit var pushSubscriptionService: PushSubscriptionService

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
        val items = listOf(PushSubscriptionItem(id = 1, endpoint = "https://push.example.com/x"))
        every { pushSubscriptionService.getSubscriptionsForCurrentUser() } returns items

        val response = pushController.getSubscriptions()

        assertThat(response.items).isEqualTo(items)
    }

    @Test
    fun `createSubscription returns 201 with the created item`() {
        val request = PushSubscriptionRequest(endpoint = "https://push.example.com/x", p256dhKey = "p", authKey = "a")
        val created = PushSubscriptionItem(id = 1, endpoint = request.endpoint)
        every { pushSubscriptionService.createSubscription(request) } returns created

        val response = pushController.createSubscription(request)

        assertThat(response.statusCode).isEqualTo(HttpStatus.CREATED)
        assertThat(response.body).isEqualTo(created)
    }

    @Test
    fun `deleteSubscription returns 204 and delegates to the service`() {
        val response = pushController.deleteSubscription(5L)

        assertThat(response.statusCode).isEqualTo(HttpStatus.NO_CONTENT)
        verify { pushSubscriptionService.deleteSubscription(5L) }
    }
}
