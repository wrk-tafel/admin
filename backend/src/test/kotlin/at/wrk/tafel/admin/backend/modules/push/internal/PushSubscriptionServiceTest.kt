package at.wrk.tafel.admin.backend.modules.push.internal

import at.wrk.tafel.admin.backend.common.auth.model.TafelJwtAuthentication
import at.wrk.tafel.admin.backend.config.properties.TafelAdminProperties
import at.wrk.tafel.admin.backend.config.properties.TafelAdminPushProperties
import at.wrk.tafel.admin.backend.database.common.lock.AdvisoryLockKey
import at.wrk.tafel.admin.backend.database.common.lock.AdvisoryLockService
import at.wrk.tafel.admin.backend.database.model.auth.UserEntity
import at.wrk.tafel.admin.backend.database.model.auth.UserRepository
import at.wrk.tafel.admin.backend.database.model.base.EmployeeEntity
import at.wrk.tafel.admin.backend.database.model.push.PushSubscriptionEntity
import at.wrk.tafel.admin.backend.database.model.push.PushSubscriptionRepository
import at.wrk.tafel.admin.backend.modules.base.exception.NotFoundException
import at.wrk.tafel.admin.backend.modules.base.exception.TafelApiException
import at.wrk.tafel.admin.backend.modules.push.model.PushSubscriptionLabelRequest
import at.wrk.tafel.admin.backend.modules.push.model.PushSubscriptionRequest
import at.wrk.tafel.admin.backend.modules.push.model.PushTestResult
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
import org.junit.jupiter.params.ParameterizedTest
import org.junit.jupiter.params.provider.CsvSource
import org.springframework.http.HttpStatus
import org.springframework.security.core.context.SecurityContextHolder
import java.time.LocalDateTime

@ExtendWith(MockKExtension::class)
internal class PushSubscriptionServiceTest {

    @RelaxedMockK
    private lateinit var pushSubscriptionRepository: PushSubscriptionRepository

    @RelaxedMockK
    private lateinit var userRepository: UserRepository

    @RelaxedMockK
    private lateinit var pushBroadcastService: PushBroadcastService

    @RelaxedMockK
    private lateinit var advisoryLockService: AdvisoryLockService

    private val configuredProperties = TafelAdminProperties().apply {
        push = TafelAdminPushProperties().apply {
            vapidPublicKey = "public-key"
            vapidPrivateKey = "private-key"
            vapidSubject = "mailto:test@localhost"
        }
    }

    private lateinit var service: PushSubscriptionService

    @BeforeEach
    fun beforeEach() {
        service = PushSubscriptionService(pushSubscriptionRepository, userRepository, configuredProperties, pushBroadcastService, advisoryLockService)

        // Runs the guarded block inline - the lock's own behaviour is AdvisoryLockServiceIT's job.
        every { advisoryLockService.withLock<Any>(any(), any()) } answers { secondArg<() -> Any>().invoke() }

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
            PushSubscriptionService(pushSubscriptionRepository, userRepository, TafelAdminProperties(), pushBroadcastService, advisoryLockService)

        assertThatThrownBy { unconfiguredService.getPublicKey() }
            .isInstanceOf(TafelApiException::class.java)
            .satisfies({ ex ->
                assertThat((ex as TafelApiException).statusCode).isEqualTo(HttpStatus.INTERNAL_SERVER_ERROR)
            })
    }

    @Test
    fun `getSubscriptionsForCurrentUser returns the current user's subscriptions`() {
        val createdAt = LocalDateTime.now().minusDays(1)
        val entity = PushSubscriptionEntity().apply {
            id = 1
            endpoint = "https://push.example.com/abc"
            userAgent = "Mozilla/5.0 Chrome/128"
            this.createdAt = createdAt
        }
        every { pushSubscriptionRepository.findAllByUserId(testUserEntity.id!!) } returns listOf(entity)

        val result = service.getSubscriptionsForCurrentUser()

        assertThat(result).hasSize(1)
        assertThat(result.first().id).isEqualTo(1L)
        assertThat(result.first().endpoint).isEqualTo("https://push.example.com/abc")
        assertThat(result.first().userAgent).isEqualTo("Mozilla/5.0 Chrome/128")
        assertThat(result.first().createdAt).isEqualTo(createdAt)
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
    fun `createSubscription persists a new subscription owned by the current user`() {
        val request = PushSubscriptionRequest(
            endpoint = "https://push.example.com/new",
            p256dhKey = "p256dh",
            authKey = "auth",
            userAgent = "Mozilla/5.0 Firefox/130",
        )
        every { pushSubscriptionRepository.findByEndpoint(request.endpoint) } returns null
        val savedSlot = slot<PushSubscriptionEntity>()
        every { pushSubscriptionRepository.saveAndFlush(capture(savedSlot)) } answers {
            savedSlot.captured.apply {
                id = 42
                createdAt = LocalDateTime.now()
            }
        }

        val result = service.createSubscription(request)

        assertThat(result.id).isEqualTo(42L)
        assertThat(result.endpoint).isEqualTo(request.endpoint)
        assertThat(result.userAgent).isEqualTo("Mozilla/5.0 Firefox/130")
        assertThat(savedSlot.captured.user).isEqualTo(testUserEntity)
        assertThat(savedSlot.captured.p256dhKey).isEqualTo("p256dh")
        assertThat(savedSlot.captured.authKey).isEqualTo("auth")
    }

    /**
     * `endpoint` is UNIQUE and the upsert is a check-then-act, so two registrations of the same
     * browser's endpoint arriving at once (two tabs both syncing on load) would otherwise both find
     * nothing and both insert - the loser getting a duplicate-key 500 instead of a registration.
     */
    @Test
    fun `createSubscription serializes the upsert against concurrent registrations`() {
        val request = PushSubscriptionRequest(endpoint = "https://push.example.com/x", p256dhKey = "p", authKey = "a")
        every { pushSubscriptionRepository.findByEndpoint(request.endpoint) } returns null
        every { pushSubscriptionRepository.saveAndFlush(any<PushSubscriptionEntity>()) } answers {
            firstArg<PushSubscriptionEntity>().apply {
                id = 1
                createdAt = LocalDateTime.now()
            }
        }

        service.createSubscription(request)

        verify { advisoryLockService.withLock<Any>(AdvisoryLockKey.REGISTER_PUSH_SUBSCRIPTION, any()) }
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
    fun `createSubscription refreshes keys and user agent for an existing row`() {
        val existing = PushSubscriptionEntity().apply {
            id = 7
            endpoint = "https://push.example.com/reused"
            p256dhKey = "old-p256dh"
            authKey = "old-auth"
            userAgent = "old-agent"
            user = testUserEntity
            createdAt = LocalDateTime.now()
        }
        val request = PushSubscriptionRequest(
            endpoint = existing.endpoint!!,
            p256dhKey = "new-p256dh",
            authKey = "new-auth",
            userAgent = "new-agent",
        )
        every { pushSubscriptionRepository.findByEndpoint(request.endpoint) } returns existing
        every { pushSubscriptionRepository.saveAndFlush(any()) } answers { firstArg() }

        val result = service.createSubscription(request)

        assertThat(result.id).isEqualTo(7L)
        assertThat(existing.p256dhKey).isEqualTo("new-p256dh")
        assertThat(existing.authKey).isEqualTo("new-auth")
        assertThat(existing.userAgent).isEqualTo("new-agent")
    }

    @Test
    fun `createSubscription reassigns ownership of an existing row to whoever is currently logged in`() {
        val originalOwner = UserEntity(
            username = "original-owner",
            password = "pw",
            employee = EmployeeEntity(personnelNumber = "p-999", firstname = "first", lastname = "last"),
        ).apply { id = 999 }
        val existing = PushSubscriptionEntity().apply {
            id = 7
            endpoint = "https://push.example.com/shared-kiosk"
            p256dhKey = "old-p256dh"
            authKey = "old-auth"
            user = originalOwner
            createdAt = LocalDateTime.now()
        }
        val request = PushSubscriptionRequest(
            endpoint = existing.endpoint!!,
            p256dhKey = "new-p256dh",
            authKey = "new-auth",
        )
        every { pushSubscriptionRepository.findByEndpoint(request.endpoint) } returns existing
        every { pushSubscriptionRepository.saveAndFlush(any()) } answers { firstArg() }

        // Current logged-in user (testUserEntity) is a different person than originalOwner - e.g.
        // a shared machine where someone else previously enabled push.
        service.createSubscription(request)

        assertThat(existing.user).isEqualTo(testUserEntity)
    }

    @Test
    fun `updateLabel sets a custom label on an owned subscription`() {
        val entity = PushSubscriptionEntity().apply {
            id = 5
            endpoint = "https://push.example.com/x"
            createdAt = LocalDateTime.now()
        }
        every { pushSubscriptionRepository.findByIdAndUserId(5L, testUserEntity.id!!) } returns entity
        every { pushSubscriptionRepository.saveAndFlush(any()) } answers { firstArg() }

        val result = service.updateLabel(5L, PushSubscriptionLabelRequest(label = "  Tafel 1  "))

        assertThat(result.label).isEqualTo("Tafel 1")
        assertThat(entity.label).isEqualTo("Tafel 1")
    }

    @Test
    fun `updateLabel clears the label when given blank`() {
        val entity = PushSubscriptionEntity().apply {
            id = 5
            endpoint = "https://push.example.com/x"
            label = "Old label"
            createdAt = LocalDateTime.now()
        }
        every { pushSubscriptionRepository.findByIdAndUserId(5L, testUserEntity.id!!) } returns entity
        every { pushSubscriptionRepository.saveAndFlush(any()) } answers { firstArg() }

        val result = service.updateLabel(5L, PushSubscriptionLabelRequest(label = "   "))

        assertThat(result.label).isNull()
        assertThat(entity.label).isNull()
    }

    @Test
    fun `updateLabel fails clearly for an unknown or foreign subscription`() {
        every { pushSubscriptionRepository.findByIdAndUserId(any(), any()) } returns null

        assertThatThrownBy { service.updateLabel(999L, PushSubscriptionLabelRequest(label = "x")) }
            .isInstanceOf(NotFoundException::class.java)
    }

    @Test
    fun `updateLabel fails clearly when nobody is logged in`() {
        every { userRepository.findByUsername(any()) } returns null

        assertThatThrownBy { service.updateLabel(5L, PushSubscriptionLabelRequest(label = "x")) }
            .isInstanceOf(TafelApiException::class.java)
            .satisfies({ ex ->
                assertThat((ex as TafelApiException).statusCode).isEqualTo(HttpStatus.UNAUTHORIZED)
            })
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

    @Test
    fun `sendTestNotification sends to the given device of the current user`() {
        val entity = PushSubscriptionEntity().apply {
            id = 5
            endpoint = "https://push.example.com/x"
            createdAt = LocalDateTime.now()
        }
        every { pushSubscriptionRepository.findByIdAndUserId(5L, testUserEntity.id!!) } returns entity
        every { pushBroadcastService.sendTo(entity, any(), any(), any()) } returns PushSendResult.SENT

        val response = service.sendTestNotification(5L)

        assertThat(response.result).isEqualTo(PushTestResult.SENT)
        verify { pushBroadcastService.sendTo(entity, "Test-Benachrichtigung", any(), "benachrichtigungen") }
    }

    @ParameterizedTest
    @CsvSource(
        "SENT, SENT",
        "EXPIRED, EXPIRED",
        "NOT_CONFIGURED, NOT_CONFIGURED",
        "FAILED, FAILED",
    )
    fun `sendTestNotification reports the send result back`(sendResult: PushSendResult, expected: PushTestResult) {
        val entity = PushSubscriptionEntity().apply {
            id = 5
            endpoint = "https://push.example.com/x"
            createdAt = LocalDateTime.now()
        }
        every { pushSubscriptionRepository.findByIdAndUserId(5L, testUserEntity.id!!) } returns entity
        every { pushBroadcastService.sendTo(entity, any(), any(), any()) } returns sendResult

        assertThat(service.sendTestNotification(5L).result).isEqualTo(expected)
    }

    @Test
    fun `sendTestNotification fails clearly for an unknown or foreign subscription`() {
        every { pushSubscriptionRepository.findByIdAndUserId(any(), any()) } returns null

        assertThatThrownBy { service.sendTestNotification(999L) }
            .isInstanceOf(NotFoundException::class.java)

        verify(exactly = 0) { pushBroadcastService.sendTo(any(), any(), any(), any()) }
    }

    @Test
    fun `sendTestNotification fails clearly when nobody is logged in`() {
        every { userRepository.findByUsername(any()) } returns null

        assertThatThrownBy { service.sendTestNotification(5L) }
            .isInstanceOf(TafelApiException::class.java)
            .satisfies({ ex ->
                assertThat((ex as TafelApiException).statusCode).isEqualTo(HttpStatus.UNAUTHORIZED)
            })
    }
}
