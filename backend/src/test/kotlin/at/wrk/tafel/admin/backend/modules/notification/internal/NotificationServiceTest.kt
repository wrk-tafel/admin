package at.wrk.tafel.admin.backend.modules.notification.internal

import at.wrk.tafel.admin.backend.common.auth.model.TafelJwtAuthentication
import at.wrk.tafel.admin.backend.database.model.auth.UserEntity
import at.wrk.tafel.admin.backend.database.model.auth.UserRepository
import at.wrk.tafel.admin.backend.database.model.notification.AnnouncementEntity
import at.wrk.tafel.admin.backend.database.model.notification.AnnouncementRepository
import at.wrk.tafel.admin.backend.database.model.notification.NotificationEntity
import at.wrk.tafel.admin.backend.database.model.notification.NotificationRepository
import at.wrk.tafel.admin.backend.modules.notification.model.NotificationKind
import io.mockk.every
import io.mockk.impl.annotations.RelaxedMockK
import io.mockk.junit5.MockKExtension
import io.mockk.mockk
import io.mockk.verify
import org.assertj.core.api.Assertions.assertThat
import org.junit.jupiter.api.AfterEach
import org.junit.jupiter.api.BeforeEach
import org.junit.jupiter.api.Test
import org.junit.jupiter.api.extension.ExtendWith
import org.springframework.security.core.context.SecurityContextHolder
import java.time.LocalDateTime

@ExtendWith(MockKExtension::class)
internal class NotificationServiceTest {

    @RelaxedMockK
    private lateinit var notificationRepository: NotificationRepository

    @RelaxedMockK
    private lateinit var announcementRepository: AnnouncementRepository

    @RelaxedMockK
    private lateinit var userRepository: UserRepository

    private lateinit var service: NotificationService

    @BeforeEach
    fun beforeEach() {
        service = NotificationService(notificationRepository, announcementRepository, userRepository)
        val authentication = mockk<TafelJwtAuthentication>()
        every { authentication.username } returns "user"
        SecurityContextHolder.getContext().authentication = authentication
        every { userRepository.findByUsername("user") } returns UserEntity(
            username = "user",
            password = "pw",
            personnelNumber = "p",
            firstname = "f",
            lastname = "l",
            enabled = true,
        ).apply { id = 7 }
    }

    @AfterEach
    fun afterEach() {
        SecurityContextHolder.clearContext()
    }

    @Test
    fun `merges inbox entries and active announcements newest first with the unread count`() {
        val now = LocalDateTime.now()
        every { notificationRepository.findAllByUserIdOrderByCreatedAtDescIdDesc(7, any()) } returns listOf(
            NotificationEntity().apply {
                id = 1
                createdAt = now.minusHours(2)
                title = "n"
                body = "b"
                targetPath = "uebersicht"
            },
        )
        every { notificationRepository.countByUserIdAndReadAtIsNull(7) } returns 1
        every { announcementRepository.findActive(any()) } returns listOf(
            AnnouncementEntity().apply {
                id = 2
                createdAt = now.minusHours(1)
                title = "a"
                message = "m"
            },
            AnnouncementEntity().apply {
                id = 3
                createdAt = now.minusHours(3)
                title = "a2"
                message = "m2"
            },
        )
        every { announcementRepository.findReadAnnouncementIds(7) } returns listOf(3L)

        val response = service.getNotificationsForCurrentUser()

        assertThat(response.items.map { it.kind to it.id }).containsExactly(
            NotificationKind.ANNOUNCEMENT to 2L,
            NotificationKind.NOTIFICATION to 1L,
            NotificationKind.ANNOUNCEMENT to 3L,
        )
        assertThat(response.items.map { it.read }).containsExactly(false, false, true)
        assertThat(response.unreadCount).isEqualTo(2)
    }

    @Test
    fun `marking everything read covers the inbox and the active announcements`() {
        every { announcementRepository.findActive(any()) } returns listOf(AnnouncementEntity().apply { id = 2 })

        service.markAllRead()

        verify { notificationRepository.markAllRead(7, any()) }
        verify { announcementRepository.markRead(listOf(2L), 7, any()) }
    }
}
