package at.wrk.tafel.admin.backend.modules.push.internal

import at.wrk.tafel.admin.backend.common.auth.model.TafelJwtAuthentication
import at.wrk.tafel.admin.backend.config.properties.TafelAdminProperties
import at.wrk.tafel.admin.backend.config.properties.TafelAdminPushProperties
import at.wrk.tafel.admin.backend.database.model.auth.UserRepository
import at.wrk.tafel.admin.backend.database.model.push.PushSubscriptionEntity
import at.wrk.tafel.admin.backend.database.model.push.PushSubscriptionRepository
import at.wrk.tafel.admin.backend.modules.base.exception.NotFoundException
import at.wrk.tafel.admin.backend.modules.base.exception.TafelApiException
import at.wrk.tafel.admin.backend.modules.push.model.PushSubscriptionRequest
import at.wrk.tafel.admin.backend.security.testUserEntity
import io.mockk.every
import io.mockk.impl.annotations.RelaxedMockK
import io.mockk.junit5.MockKExtension
import io.mockk.slot
import io.mockk.verify
import org.assertj.core.api.Assertions.assertThat
import org.assertj.core.api.Assertions.assertThatThrownBy
import org.junit.jupiter.api.AfterEach
import org.junit.jupiter.api.BeforeEach
import org.junit.jupiter.api.Test
import org.junit.jupiter.api.extension.ExtendWith
import org.springframework.http.HttpStatus
import org.springframework.security.core.context.SecurityContextHolder

@ExtendWith(MockKExtension::class)
internal class PushSubscriptionServiceTest {

    @RelaxedMockK
    private lateinit var pushSubscriptionRepository: PushSubscriptionRepository

    @RelaxedMockK
    private lateinit var userRepository: UserRepository

    private val configuredProperties = TafelAdminProperties(
        push = TafelAdminPushProperties(
            vapidPublicKey = "public-key",
            vapidPrivateKey = "private-key",
            vapidSubject = "mailto:test@localhost",
        ),
    )

    private lateinit var service: PushSubscriptionService

    @BeforeEach
    fun beforeEach() {
        service = PushSubscriptionService(pushSubscriptionRepository, userRepository, configuredProperties)

        every { userRepository.findByUsername(any()) } returns testUserEntity
        SecurityContextHolder.getContext().authentication =
            TafelJwtAuthentication("TOKEN", testUserEntity.username, true)
    }

    @AfterEach
    fun afterEach() {
        SecurityContextHolder.clearContext()
    }

    @Test
    fun `getPublicKey returns the configured vapid public key`() {
        val response = service.getPublicKey()

        assertThat(response.publicKey).isEqualTo("public-key")
    }

    @Test
    fun `getPublicKey fails clearly when push isn't configured`() {
        val unconfiguredService =
            PushSubscriptionService(pushSubscriptionRepository, userRepository, TafelAdminProperties(push = null))

        assertThatThrownBy { unconfiguredService.getPublicKey() }
            .isInstanceOf(TafelApiException::class.java)
            .satisfies({ ex ->
                assertThat((ex as TafelApiException).statusCode).isEqualTo(HttpStatus.INTERNAL_SERVER_ERROR)
            })
    }

    @Test
    fun `getSubscriptionsForCurrentUser returns the current user's subscriptions`() {
        val entity = PushSubscriptionEntity().apply {
            id = 1
            endpoint = "https://push.example.com/abc"
        }
        every { pushSubscriptionRepository.findAllByUserId(testUserEntity.id!!) } returns listOf(entity)

        val result = service.getSubscriptionsForCurrentUser()

        assertThat(result).hasSize(1)
        assertThat(result.first().id).isEqualTo(1L)
        assertThat(result.first().endpoint).isEqualTo("https://push.example.com/abc")
    }

    @Test
    fun `getSubscriptionsForCurrentUser returns an empty list when nobody is logged in`() {
        every { userRepository.findByUsername(any()) } returns null

        val result = service.getSubscriptionsForCurrentUser()

        assertThat(result).isEmpty()
    }

    @Test
    fun `getSubscriptionsForCurrentUser returns an empty list when the authentication has no username`() {
        SecurityContextHolder.getContext().authentication = TafelJwtAuthentication("TOKEN", null, true)

        val result = service.getSubscriptionsForCurrentUser()

        assertThat(result).isEmpty()
    }

    @Test
    fun `createSubscription persists a new subscription for the current user`() {
        val request = PushSubscriptionRequest(
            endpoint = "https://push.example.com/new",
            p256dhKey = "p256dh",
            authKey = "auth",
        )
        every { pushSubscriptionRepository.findByEndpoint(request.endpoint) } returns null
        val savedSlot = slot<PushSubscriptionEntity>()
        every { pushSubscriptionRepository.saveAndFlush(capture(savedSlot)) } answers {
            savedSlot.captured.apply { id = 42 }
        }

        val result = service.createSubscription(request)

        assertThat(result.id).isEqualTo(42L)
        assertThat(result.endpoint).isEqualTo(request.endpoint)
        assertThat(savedSlot.captured.user).isEqualTo(testUserEntity)
        assertThat(savedSlot.captured.p256dhKey).isEqualTo("p256dh")
        assertThat(savedSlot.captured.authKey).isEqualTo("auth")
    }

    @Test
    fun `createSubscription fails clearly when nobody is logged in`() {
        every { userRepository.findByUsername(any()) } returns null
        val request = PushSubscriptionRequest(endpoint = "https://push.example.com/x", p256dhKey = "p", authKey = "a")

        assertThatThrownBy { service.createSubscription(request) }
            .isInstanceOf(TafelApiException::class.java)
            .satisfies({ ex ->
                assertThat((ex as TafelApiException).statusCode).isEqualTo(HttpStatus.UNAUTHORIZED)
            })
    }

    @Test
    fun `createSubscription reclaims an existing row for the same endpoint`() {
        val existing = PushSubscriptionEntity().apply {
            id = 7
            endpoint = "https://push.example.com/reused"
            p256dhKey = "old-p256dh"
            authKey = "old-auth"
        }
        val request = PushSubscriptionRequest(
            endpoint = existing.endpoint!!,
            p256dhKey = "new-p256dh",
            authKey = "new-auth",
        )
        every { pushSubscriptionRepository.findByEndpoint(request.endpoint) } returns existing
        every { pushSubscriptionRepository.saveAndFlush(any()) } answers { firstArg() }

        val result = service.createSubscription(request)

        assertThat(result.id).isEqualTo(7L)
        assertThat(existing.p256dhKey).isEqualTo("new-p256dh")
        assertThat(existing.authKey).isEqualTo("new-auth")
        assertThat(existing.user).isEqualTo(testUserEntity)
    }

    @Test
    fun `deleteSubscription removes an owned subscription`() {
        every { pushSubscriptionRepository.deleteByIdAndUserId(5L, testUserEntity.id!!) } returns 1L

        service.deleteSubscription(5L)

        verify { pushSubscriptionRepository.deleteByIdAndUserId(5L, testUserEntity.id!!) }
    }

    @Test
    fun `deleteSubscription fails clearly for an unknown or foreign subscription`() {
        every { pushSubscriptionRepository.deleteByIdAndUserId(any(), any()) } returns 0L

        assertThatThrownBy { service.deleteSubscription(999L) }
            .isInstanceOf(NotFoundException::class.java)
    }

    @Test
    fun `deleteSubscription fails clearly when nobody is logged in`() {
        every { userRepository.findByUsername(any()) } returns null

        assertThatThrownBy { service.deleteSubscription(5L) }
            .isInstanceOf(TafelApiException::class.java)
            .satisfies({ ex ->
                assertThat((ex as TafelApiException).statusCode).isEqualTo(HttpStatus.UNAUTHORIZED)
            })
    }
}
