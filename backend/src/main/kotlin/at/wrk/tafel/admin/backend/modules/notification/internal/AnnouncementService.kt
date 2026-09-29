package at.wrk.tafel.admin.backend.modules.notification.internal

import at.wrk.tafel.admin.backend.common.auth.model.TafelJwtAuthentication
import at.wrk.tafel.admin.backend.database.model.auth.UserRepository
import at.wrk.tafel.admin.backend.database.model.notification.AnnouncementEntity
import at.wrk.tafel.admin.backend.database.model.notification.AnnouncementRepository
import at.wrk.tafel.admin.backend.modules.base.exception.NotFoundException
import at.wrk.tafel.admin.backend.modules.notification.AnnouncementPublishedEvent
import at.wrk.tafel.admin.backend.modules.notification.model.AnnouncementListResponse
import at.wrk.tafel.admin.backend.modules.notification.model.AnnouncementRequest
import at.wrk.tafel.admin.backend.modules.notification.model.AnnouncementResponse
import org.springframework.context.ApplicationEventPublisher
import org.springframework.security.core.context.SecurityContextHolder
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional
import java.time.LocalDateTime

/** Administrators' side of the bell: the messages shown to every user. */
@Service
class AnnouncementService(
    private val announcementRepository: AnnouncementRepository,
    private val userRepository: UserRepository,
    private val eventPublisher: ApplicationEventPublisher,
    private val changeSignal: NotificationChangeSignal,
) {

    @Transactional(readOnly = true)
    fun getAnnouncements(): AnnouncementListResponse = AnnouncementListResponse(
        items = announcementRepository.findAllByOrderByCreatedAtDescIdDesc().map { it.toResponse() },
    )

    @Transactional
    fun create(request: AnnouncementRequest): AnnouncementResponse {
        val entity = AnnouncementEntity().apply {
            createdAt = LocalDateTime.now()
            createdBy = currentUserId()
        }
        apply(entity, request)
        val saved = announcementRepository.save(entity)
        changeSignal.signal()
        // pushed to the devices that opted in, once the row is committed - see push's AnnouncementPushListener
        eventPublisher.publishEvent(AnnouncementPublishedEvent(saved.title, saved.message))
        return saved.toResponse()
    }

    @Transactional
    fun update(id: Long, request: AnnouncementRequest): AnnouncementResponse {
        val entity = announcementRepository.findById(id).orElseThrow { NotFoundException(NOT_FOUND) }
        apply(entity, request)
        val saved = announcementRepository.save(entity)
        changeSignal.signal()
        return saved.toResponse()
    }

    @Transactional
    fun delete(id: Long) {
        val entity = announcementRepository.findById(id).orElseThrow { NotFoundException(NOT_FOUND) }
        announcementRepository.delete(entity)
        changeSignal.signal()
    }

    private fun apply(entity: AnnouncementEntity, request: AnnouncementRequest) {
        entity.title = request.title.trim()
        entity.message = request.message.trim()
        entity.expiresAt = request.expiresAt
    }

    private fun AnnouncementEntity.toResponse() = AnnouncementResponse(
        id = id!!,
        title = title,
        message = message,
        createdAt = createdAt,
        expiresAt = expiresAt,
        active = expiresAt?.isAfter(LocalDateTime.now()) ?: true,
    )

    private fun currentUserId(): Long? {
        val username = (SecurityContextHolder.getContext().authentication as TafelJwtAuthentication).username ?: return null
        return userRepository.findByUsername(username)?.id
    }

    private companion object {
        const val NOT_FOUND = "Ankündigung nicht gefunden"
    }
}
