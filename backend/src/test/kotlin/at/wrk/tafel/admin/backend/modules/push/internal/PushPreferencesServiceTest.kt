package at.wrk.tafel.admin.backend.modules.push.internal

import at.wrk.tafel.admin.backend.common.auth.model.TafelJwtAuthentication
import at.wrk.tafel.admin.backend.common.auth.model.UserPermissions
import at.wrk.tafel.admin.backend.database.model.auth.UserAuthorityEntity
import at.wrk.tafel.admin.backend.database.model.auth.UserEntity
import at.wrk.tafel.admin.backend.database.model.auth.UserRepository
import at.wrk.tafel.admin.backend.database.model.base.EmployeeEntity
import at.wrk.tafel.admin.backend.database.model.push.PushNotificationType
import at.wrk.tafel.admin.backend.database.model.push.PushPreferencesEntity
import at.wrk.tafel.admin.backend.database.model.push.PushPreferencesRepository
import at.wrk.tafel.admin.backend.database.model.push.PushTypePreferenceEntity
import at.wrk.tafel.admin.backend.database.model.push.PushTypePreferenceRepository
import at.wrk.tafel.admin.backend.modules.base.exception.TafelApiException
import at.wrk.tafel.admin.backend.modules.push.model.PushMasterPreferenceRequest
import at.wrk.tafel.admin.backend.modules.push.model.PushTypePreferenceRequest
import at.wrk.tafel.admin.backend.security.testUserEntity
import io.mockk.every
import io.mockk.impl.annotations.RelaxedMockK
import io.mockk.junit5.MockKExtension
import io.mockk.slot
import org.assertj.core.api.Assertions.assertThat
import org.assertj.core.api.Assertions.assertThatThrownBy
import org.junit.jupiter.api.AfterEach
import org.junit.jupiter.api.BeforeEach
import org.junit.jupiter.api.Test
import org.junit.jupiter.api.extension.ExtendWith
import org.springframework.http.HttpStatus
import org.springframework.security.core.context.SecurityContextHolder
import at.wrk.tafel.admin.backend.modules.push.model.PushNotificationType as PushNotificationTypeApi

@ExtendWith(MockKExtension::class)
internal class PushPreferencesServiceTest {

    @RelaxedMockK
    private lateinit var pushPreferencesRepository: PushPreferencesRepository

    @RelaxedMockK
    private lateinit var pushTypePreferenceRepository: PushTypePreferenceRepository

    @RelaxedMockK
    private lateinit var userRepository: UserRepository

    private lateinit var service: PushPreferencesService

    @BeforeEach
    fun beforeEach() {
        service = PushPreferencesService(pushPreferencesRepository, pushTypePreferenceRepository, userRepository)

        every { userRepository.findByUsername(any()) } returns testUserEntity
        SecurityContextHolder.getContext().authentication =
            TafelJwtAuthentication("TOKEN", testUserEntity.username, true)

        every { pushPreferencesRepository.findByUserId(any()) } returns null
        every { pushTypePreferenceRepository.findAllByUserId(any()) } returns emptyList()
        every { pushTypePreferenceRepository.findByUserIdAndNotificationType(any(), any()) } returns null
    }

    @AfterEach
    fun afterEach() {
        SecurityContextHolder.clearContext()
    }

    @Test
    fun `getPreferencesForCurrentUser defaults the master switch and every listed type to enabled`() {
        val result = service.getPreferencesForCurrentUser()

        assertThat(result.masterEnabled).isTrue()
        assertThat(result.types).allSatisfy { assertThat(it.enabled).isTrue() }
    }

    /**
     * The test user holds CHECKIN and USER_MANAGEMENT, so it is an audience for the two unrestricted
     * distribution types plus the lockout one - and for none of the rest. Offering a toggle for a
     * type this user can never receive would be a setting with no effect whichever way it is set.
     */
    @Test
    fun `getPreferencesForCurrentUser lists only the types this user can actually receive`() {
        val result = service.getPreferencesForCurrentUser()

        assertThat(result.types.map { it.type }).containsExactlyInAnyOrder(
            PushNotificationTypeApi.DISTRIBUTION_STARTED,
            PushNotificationTypeApi.DISTRIBUTION_CLOSED,
            PushNotificationTypeApi.USER_LOCKED_OUT,
        )
    }

    @Test
    fun `getPreferencesForCurrentUser lists every type for a user holding the supervisor permission`() {
        val supervisor = UserEntity(
            username = "supervisor",
            password = "pw",
            employee = EmployeeEntity(personnelNumber = "s-1", firstname = "first", lastname = "last"),
        ).apply {
            id = 42
            authorities = mutableListOf(UserAuthorityEntity(user = this, name = UserPermissions.SUPERVISOR.key))
        }
        every { userRepository.findByUsername(any()) } returns supervisor

        val result = service.getPreferencesForCurrentUser()

        assertThat(result.types.map { it.type }).containsExactlyInAnyOrderElementsOf(PushNotificationTypeApi.entries)
    }

    @Test
    fun `getPreferencesForCurrentUser reflects an existing master preference`() {
        every { pushPreferencesRepository.findByUserId(testUserEntity.id!!) } returns
            PushPreferencesEntity().apply { enabled = false }

        val result = service.getPreferencesForCurrentUser()

        assertThat(result.masterEnabled).isFalse()
    }

    @Test
    fun `getPreferencesForCurrentUser reflects an existing type preference`() {
        every { pushTypePreferenceRepository.findAllByUserId(testUserEntity.id!!) } returns listOf(
            PushTypePreferenceEntity().apply {
                notificationType = PushNotificationType.DISTRIBUTION_STARTED
                enabled = false
            },
        )

        val result = service.getPreferencesForCurrentUser()

        val started = result.types.first { it.type == PushNotificationTypeApi.DISTRIBUTION_STARTED }
        val closed = result.types.first { it.type == PushNotificationTypeApi.DISTRIBUTION_CLOSED }
        assertThat(started.enabled).isFalse()
        assertThat(closed.enabled).isTrue()
    }

    @Test
    fun `getPreferencesForCurrentUser fails clearly when nobody is logged in`() {
        every { userRepository.findByUsername(any()) } returns null

        assertThatThrownBy { service.getPreferencesForCurrentUser() }
            .isInstanceOf(TafelApiException::class.java)
            .satisfies({ ex ->
                assertThat((ex as TafelApiException).statusCode).isEqualTo(HttpStatus.UNAUTHORIZED)
            })
    }

    @Test
    fun `updateMasterPreference persists a new preference row`() {
        val savedSlot = slot<PushPreferencesEntity>()
        every { pushPreferencesRepository.saveAndFlush(capture(savedSlot)) } answers { savedSlot.captured }

        val result = service.updateMasterPreference(PushMasterPreferenceRequest(enabled = false))

        assertThat(savedSlot.captured.user).isEqualTo(testUserEntity)
        assertThat(savedSlot.captured.enabled).isFalse()
        assertThat(result.masterEnabled).isFalse()
    }

    @Test
    fun `updateMasterPreference updates an existing preference row instead of duplicating it`() {
        val existing = PushPreferencesEntity().apply {
            id = 5
            enabled = true
        }
        every { pushPreferencesRepository.findByUserId(testUserEntity.id!!) } returns existing
        every { pushPreferencesRepository.saveAndFlush(any()) } answers { firstArg() }

        service.updateMasterPreference(PushMasterPreferenceRequest(enabled = false))

        assertThat(existing.enabled).isFalse()
    }

    @Test
    fun `updateMasterPreference fails clearly when nobody is logged in`() {
        every { userRepository.findByUsername(any()) } returns null

        assertThatThrownBy { service.updateMasterPreference(PushMasterPreferenceRequest(enabled = false)) }
            .isInstanceOf(TafelApiException::class.java)
    }

    @Test
    fun `updateTypePreference persists a new preference row`() {
        val savedSlot = slot<PushTypePreferenceEntity>()
        every { pushTypePreferenceRepository.saveAndFlush(capture(savedSlot)) } answers { savedSlot.captured }

        val result = service.updateTypePreference(PushNotificationTypeApi.DISTRIBUTION_STARTED, PushTypePreferenceRequest(enabled = false))

        assertThat(savedSlot.captured.user).isEqualTo(testUserEntity)
        assertThat(savedSlot.captured.notificationType).isEqualTo(PushNotificationType.DISTRIBUTION_STARTED)
        assertThat(savedSlot.captured.enabled).isFalse()
        assertThat(result.types.first { it.type == PushNotificationTypeApi.DISTRIBUTION_STARTED }.enabled).isFalse()
    }

    @Test
    fun `updateTypePreference updates an existing preference row instead of duplicating it`() {
        val existing = PushTypePreferenceEntity().apply {
            id = 5
            notificationType = PushNotificationType.DISTRIBUTION_CLOSED
            enabled = true
        }
        every {
            pushTypePreferenceRepository.findByUserIdAndNotificationType(testUserEntity.id!!, PushNotificationType.DISTRIBUTION_CLOSED)
        } returns existing
        every { pushTypePreferenceRepository.saveAndFlush(any()) } answers { firstArg() }

        service.updateTypePreference(PushNotificationTypeApi.DISTRIBUTION_CLOSED, PushTypePreferenceRequest(enabled = false))

        assertThat(existing.enabled).isFalse()
    }

    @Test
    fun `updateTypePreference fails clearly when nobody is logged in`() {
        every { userRepository.findByUsername(any()) } returns null

        assertThatThrownBy {
            service.updateTypePreference(PushNotificationTypeApi.DISTRIBUTION_STARTED, PushTypePreferenceRequest(enabled = false))
        }.isInstanceOf(TafelApiException::class.java)
    }

    @Test
    fun `isEnabled defaults to true when neither a master nor a type preference row exists`() {
        assertThat(service.isEnabled(testUserEntity.id!!, PushNotificationType.DISTRIBUTION_STARTED)).isTrue()
    }

    @Test
    fun `isEnabled is false when the master switch is off, regardless of the type preference`() {
        every { pushPreferencesRepository.findByUserId(testUserEntity.id!!) } returns
            PushPreferencesEntity().apply { enabled = false }
        every {
            pushTypePreferenceRepository.findByUserIdAndNotificationType(testUserEntity.id!!, PushNotificationType.DISTRIBUTION_STARTED)
        } returns PushTypePreferenceEntity().apply { enabled = true }

        assertThat(service.isEnabled(testUserEntity.id!!, PushNotificationType.DISTRIBUTION_STARTED)).isFalse()
    }

    @Test
    fun `isEnabled is false when the master switch is on but the type preference is off`() {
        every { pushPreferencesRepository.findByUserId(testUserEntity.id!!) } returns
            PushPreferencesEntity().apply { enabled = true }
        every {
            pushTypePreferenceRepository.findByUserIdAndNotificationType(testUserEntity.id!!, PushNotificationType.DISTRIBUTION_STARTED)
        } returns PushTypePreferenceEntity().apply { enabled = false }

        assertThat(service.isEnabled(testUserEntity.id!!, PushNotificationType.DISTRIBUTION_STARTED)).isFalse()
    }

    @Test
    fun `isEnabled is true when the master switch is on and the type preference is on`() {
        every { pushPreferencesRepository.findByUserId(testUserEntity.id!!) } returns
            PushPreferencesEntity().apply { enabled = true }
        every {
            pushTypePreferenceRepository.findByUserIdAndNotificationType(testUserEntity.id!!, PushNotificationType.DISTRIBUTION_STARTED)
        } returns PushTypePreferenceEntity().apply { enabled = true }

        assertThat(service.isEnabled(testUserEntity.id!!, PushNotificationType.DISTRIBUTION_STARTED)).isTrue()
    }
}
