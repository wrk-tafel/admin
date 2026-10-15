package at.wrk.tafel.admin.backend.common.auth

import at.wrk.tafel.admin.backend.common.auth.components.TafelUserDetailsManager
import at.wrk.tafel.admin.backend.common.auth.components.UserSessionService
import at.wrk.tafel.admin.backend.common.auth.model.TafelAuthentication
import at.wrk.tafel.admin.backend.common.auth.model.UserSessionListResponse
import at.wrk.tafel.admin.backend.modules.base.exception.BusinessRuleException
import at.wrk.tafel.admin.backend.modules.base.exception.NotFoundException
import org.springframework.http.ResponseEntity
import org.springframework.security.access.prepost.PreAuthorize
import org.springframework.security.core.context.SecurityContextHolder
import org.springframework.web.bind.annotation.DeleteMapping
import org.springframework.web.bind.annotation.GetMapping
import org.springframework.web.bind.annotation.PathVariable
import org.springframework.web.bind.annotation.RequestMapping
import org.springframework.web.bind.annotation.RestController

/**
 * The login sessions of an account (ADR-0070): "Mein Konto" > "Sitzungen" for the caller's own, and
 * the user detail screen's "Alle Sitzungen beenden" for an administrator. A session is named by its
 * key ([UserSessionListResponse]), never by the id its cookie carries.
 */
@RestController
@RequestMapping("/api/users")
class UserSessionController(
    private val userSessionService: UserSessionService,
    private val userDetailsManager: TafelUserDetailsManager,
) {

    @GetMapping("/sessions")
    @PreAuthorize("isAuthenticated()")
    fun getOwnSessions(): UserSessionListResponse {
        val authentication = currentAuthentication()
        return UserSessionListResponse(items = userSessionService.listSessions(authentication.username!!, authentication.sessionKey))
    }

    /** Ends one of the caller's other sessions. The current one is ended by logging out. */
    @DeleteMapping("/sessions/{sessionKey}")
    @PreAuthorize("isAuthenticated()")
    fun endOwnSession(@PathVariable sessionKey: String): ResponseEntity<Unit> {
        val authentication = currentAuthentication()
        if (sessionKey == authentication.sessionKey) {
            throw BusinessRuleException("Die aktuelle Sitzung wird mit \"Abmelden\" beendet!")
        }
        if (!userSessionService.endSession(authentication.username!!, sessionKey)) {
            throw NotFoundException("Sitzung nicht gefunden!")
        }
        return ResponseEntity.noContent().build()
    }

    /** Ends every session of the caller's but the current one - "auf allen anderen Geräten abmelden". */
    @DeleteMapping("/sessions")
    @PreAuthorize("isAuthenticated()")
    fun endOtherOwnSessions(): ResponseEntity<Unit> {
        val authentication = currentAuthentication()
        userSessionService.endOtherSessions(authentication.username!!, authentication.sessionKey)
        return ResponseEntity.noContent().build()
    }

    /**
     * Ends every session of an account - a forgotten login on a shared PC, a lost phone. The caller's own
     * current session is kept when the account is their own, so the button does not log its user out.
     */
    @DeleteMapping("/{userId}/sessions")
    @PreAuthorize("hasAuthority('USER_MANAGEMENT')")
    fun endSessionsOfUser(@PathVariable userId: Long): ResponseEntity<Unit> {
        val user = userDetailsManager.loadUserById(userId)
            ?: throw NotFoundException("Benutzer (ID: $userId) nicht vorhanden!")
        val authentication = currentAuthentication()
        if (authentication.userId == user.id) {
            userSessionService.endOtherSessions(user.username, authentication.sessionKey)
        } else {
            userSessionService.endAllSessions(user.username)
        }
        return ResponseEntity.noContent().build()
    }

    private fun currentAuthentication() = SecurityContextHolder.getContext().authentication as TafelAuthentication
}
