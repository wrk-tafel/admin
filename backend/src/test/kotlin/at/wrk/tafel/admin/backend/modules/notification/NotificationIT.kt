package at.wrk.tafel.admin.backend.modules.notification

import at.wrk.tafel.admin.backend.TafelBaseIntegrationTest
import at.wrk.tafel.admin.backend.database.model.auth.UserEntity
import at.wrk.tafel.admin.backend.database.model.auth.UserRepository
import at.wrk.tafel.admin.backend.database.model.notification.AnnouncementEntity
import at.wrk.tafel.admin.backend.database.model.notification.AnnouncementRepository
import at.wrk.tafel.admin.backend.database.model.notification.NotificationRepository
import at.wrk.tafel.admin.backend.modules.notification.internal.NotificationCleanupService
import org.assertj.core.api.Assertions.assertThat
import org.junit.jupiter.api.Test
import org.springframework.beans.factory.annotation.Autowired
import org.springframework.data.domain.PageRequest
import java.time.LocalDateTime
import java.util.UUID

/**
 * The bell's tables and queries against a real Postgres: the sequences the entities need, the
 * `on conflict` insert of an announcement's read state, and the `SKIP LOCKED` retention deletes -
 * none of which a mocked repository can prove.
 */
internal class NotificationIT : TafelBaseIntegrationTest() {

    @Autowired
    private lateinit var publisher: NotificationPublisher

    @Autowired
    private lateinit var notificationRepository: NotificationRepository

    @Autowired
    private lateinit var announcementRepository: AnnouncementRepository

    @Autowired
    private lateinit var userRepository: UserRepository

    @Autowired
    private lateinit var cleanupService: NotificationCleanupService

    private fun createUser(): Long {
        val name = "bell-" + UUID.randomUUID().toString().take(8)
        return userRepository.save(
            UserEntity(
                username = name,
                password = "pw",
                personnelNumber = name,
                firstname = "Bell",
                lastname = "Test",
                enabled = true,
            ),
        ).id!!
    }

    @Test
    fun `published notifications land in the inbox of each recipient and can be marked read`() {
        val userId = createUser()
        val otherId = createUser()

        publisher.publish(listOf(userId, otherId), "DISTRIBUTION_STARTED", "Ausgabe gestartet", "Los geht es", "uebersicht")

        val inbox = notificationRepository.findAllByUserIdOrderByCreatedAtDescIdDesc(userId, PageRequest.of(0, 10))
        assertThat(inbox).hasSize(1)
        assertThat(inbox[0].targetPath).isEqualTo("uebersicht")
        assertThat(notificationRepository.countByUserIdAndReadAtIsNull(userId)).isEqualTo(1)

        // another user's entry cannot be marked through this user's id
        assertThat(notificationRepository.markRead(inbox[0].id!!, otherId + 1000, LocalDateTime.now())).isZero()
        assertThat(notificationRepository.markRead(inbox[0].id!!, userId, LocalDateTime.now())).isEqualTo(1)
        assertThat(notificationRepository.countByUserIdAndReadAtIsNull(userId)).isZero()
        assertThat(notificationRepository.countByUserIdAndReadAtIsNull(otherId)).isEqualTo(1)
    }

    @Test
    fun `an announcement's read state is per user and marking it twice is harmless`() {
        val userId = createUser()
        val otherId = createUser()
        val announcement = announcementRepository.save(
            AnnouncementEntity().apply {
                title = "Hinweis"
                message = "Text"
            },
        )

        announcementRepository.markRead(listOf(announcement.id!!), userId, LocalDateTime.now())
        announcementRepository.markRead(listOf(announcement.id!!), userId, LocalDateTime.now())

        assertThat(announcementRepository.findReadAnnouncementIds(userId)).containsExactly(announcement.id)
        assertThat(announcementRepository.findReadAnnouncementIds(otherId)).isEmpty()
        assertThat(announcementRepository.findActive(LocalDateTime.now()).map { it.id }).contains(announcement.id)
    }

    @Test
    fun `an expired announcement is no longer active`() {
        val expired = announcementRepository.save(
            AnnouncementEntity().apply {
                title = "Alt"
                message = "Text"
                expiresAt = LocalDateTime.now().minusMinutes(1)
            },
        )

        assertThat(announcementRepository.findActive(LocalDateTime.now()).map { it.id }).doesNotContain(expired.id)
    }

    @Test
    fun `the cleanup removes old inbox entries and long-expired announcements only`() {
        val userId = createUser()
        publisher.publish(listOf(userId), "DISTRIBUTION_STARTED", "Neu", "Text", null)
        val old = notificationRepository.findAllByUserIdOrderByCreatedAtDescIdDesc(userId, PageRequest.of(0, 1))[0]
        publisher.publish(listOf(userId), "DISTRIBUTION_CLOSED", "Alt", "Text", null)
        val oldest = notificationRepository.findAllByUserIdOrderByCreatedAtDescIdDesc(userId, PageRequest.of(0, 1))[0]
        oldest.createdAt = LocalDateTime.now().minusDays(40)
        notificationRepository.save(oldest)

        val longExpired = announcementRepository.save(
            AnnouncementEntity().apply {
                title = "Lange abgelaufen"
                message = "Text"
                expiresAt = LocalDateTime.now().minusDays(40)
            },
        )
        val justExpired = announcementRepository.save(
            AnnouncementEntity().apply {
                title = "Gerade abgelaufen"
                message = "Text"
                expiresAt = LocalDateTime.now().minusDays(1)
            },
        )

        cleanupService.cleanup()

        assertThat(notificationRepository.findById(oldest.id!!)).isEmpty
        assertThat(notificationRepository.findById(old.id!!)).isPresent
        assertThat(announcementRepository.findById(longExpired.id!!)).isEmpty
        assertThat(announcementRepository.findById(justExpired.id!!)).isPresent
    }
}
