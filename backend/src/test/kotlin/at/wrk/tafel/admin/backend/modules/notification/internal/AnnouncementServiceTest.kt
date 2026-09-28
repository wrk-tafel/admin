package at.wrk.tafel.admin.backend.modules.notification.internal

import at.wrk.tafel.admin.backend.common.auth.model.TafelJwtAuthentication
import at.wrk.tafel.admin.backend.database.model.auth.UserEntity
import at.wrk.tafel.admin.backend.database.model.auth.UserRepository
import at.wrk.tafel.admin.backend.database.model.notification.AnnouncementEntity
import at.wrk.tafel.admin.backend.database.model.notification.AnnouncementRepository
import at.wrk.tafel.admin.backend.modules.base.exception.NotFoundException
import at.wrk.tafel.admin.backend.modules.notification.model.AnnouncementRequest
import io.mockk.every
import io.mockk.impl.annotations.RelaxedMockK
import io.mockk.junit5.MockKExtension
import io.mockk.mockk
import io.mockk.slot
import io.mockk.verify
import org.assertj.core.api.Assertions.assertThat
import org.assertj.core.api.Assertions.assertThatThrownBy
import org.junit.jupiter.api.AfterEach
import org.junit.jupiter.api.BeforeEach
import org.junit.jupiter.api.Test
import org.junit.jupiter.api.extension.ExtendWith
import org.springframework.security.core.context.SecurityContextHolder
import java.time.LocalDateTime
import java.util.Optional

@ExtendWith(MockKExtension::class)
internal class AnnouncementServiceTest {

    @RelaxedMockK
    private lateinit var announcementRepository: AnnouncementRepository

    @RelaxedMockK
    private lateinit var userRepository: UserRepository

    private lateinit var service: AnnouncementService

    @BeforeEach
    fun beforeEach() {
        service = AnnouncementService(announcementRepository, userRepository)
        val authentication = mockk<TafelJwtAuthentication>()
        every { authentication.username } returns "admin"
        SecurityContextHolder.getContext().authentication = authentication
        every { userRepository.findByUsername("admin") } returns UserEntity(
            username = "admin",
            password = "pw",
            personnelNumber = "p",
            firstname = "f",
            lastname = "l",
            enabled = true,
        ).apply { id = 3 }
        every { announcementRepository.save(any()) } answers { firstArg<AnnouncementEntity>().apply { if (id == null) id = 11 } }
    }

    @AfterEach
    fun afterEach() {
        SecurityContextHolder.clearContext()
    }

    @Test
    fun `creates a trimmed announcement attributed to the calling user`() {
        val response = service.create(AnnouncementRequest(title = "  Titel ", message = " Text  ", expiresAt = null))

        val saved = slot<AnnouncementEntity>()
        verify { announcementRepository.save(capture(saved)) }
        assertThat(saved.captured.title).isEqualTo("Titel")
        assertThat(saved.captured.message).isEqualTo("Text")
        assertThat(saved.captured.createdBy).isEqualTo(3)
        assertThat(response.active).isTrue()
    }

    @Test
    fun `an announcement whose expiry has passed is reported as inactive`() {
        val response = service.create(
            AnnouncementRequest(title = "T", message = "M", expiresAt = LocalDateTime.now().minusHours(1)),
        )

        assertThat(response.active).isFalse()
    }

    @Test
    fun `updates an existing announcement`() {
        val existing = AnnouncementEntity().apply {
            id = 5
            title = "Alt"
            message = "Alt"
        }
        every { announcementRepository.findById(5) } returns Optional.of(existing)

        val response = service.update(5, AnnouncementRequest(title = "Neu", message = "Neuer Text"))

        assertThat(response.title).isEqualTo("Neu")
        assertThat(existing.message).isEqualTo("Neuer Text")
    }

    @Test
    fun `updating or deleting an unknown announcement is a not-found`() {
        every { announcementRepository.findById(9) } returns Optional.empty()

        assertThatThrownBy { service.update(9, AnnouncementRequest(title = "T", message = "M")) }
            .isInstanceOf(NotFoundException::class.java)
        assertThatThrownBy { service.delete(9) }.isInstanceOf(NotFoundException::class.java)
    }

    @Test
    fun `deletes an existing announcement`() {
        val existing = AnnouncementEntity().apply { id = 5 }
        every { announcementRepository.findById(5) } returns Optional.of(existing)

        service.delete(5)

        verify { announcementRepository.delete(existing) }
    }

    @Test
    fun `lists newest first`() {
        every { announcementRepository.findAllByOrderByCreatedAtDescIdDesc() } returns listOf(
            AnnouncementEntity().apply {
                id = 2
                title = "B"
                message = "m"
            },
            AnnouncementEntity().apply {
                id = 1
                title = "A"
                message = "m"
            },
        )

        assertThat(service.getAnnouncements().items.map { it.id }).containsExactly(2, 1)
    }
}
