package at.wrk.tafel.admin.backend.common.auth.components

import at.wrk.tafel.admin.backend.common.auth.model.TafelUser
import at.wrk.tafel.admin.backend.database.common.audit.AuditLogWriter
import at.wrk.tafel.admin.backend.database.common.audit.AuditOperation
import at.wrk.tafel.admin.backend.database.common.audit.AuditScope
import at.wrk.tafel.admin.backend.database.model.auth.UserRepository
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional
import java.time.Clock
import java.time.LocalDateTime

/**
 * What a successful login leaves behind: `users.last_login` moved forward, and one entry in the
 * audit trail, so "who logged in, and when" can be answered from the same log as everything else -
 * see [AuditScope.USER_LOGIN_ENTITY_TYPE].
 *
 * Both writes share one transaction: [AuditLogWriter.record] only takes effect via its
 * `beforeCommit` synchronization, and using the transaction [UserRepository.updateLastLogin] would
 * otherwise open on its own is what gets one for free instead of opening a second, pointless one.
 *
 * The audit entry's actor is the logging-in user themselves, passed explicitly as
 * [AuditLogWriter.PendingEntry.actorOverride] - at this point in the request `SecurityContextHolder`
 * holds nothing yet (this app is stateless; the JWT that would populate it is the very thing this
 * login is about to issue), so the usual `SecurityContext`-resolved actor would otherwise record the
 * login as done by nobody.
 */
@Service
class LoginAuditService(
    private val userRepository: UserRepository,
    private val auditLogWriter: AuditLogWriter,
    private val clock: Clock,
) {

    @Transactional
    fun recordLogin(user: TafelUser) {
        userRepository.updateLastLogin(user.username, LocalDateTime.now(clock))

        auditLogWriter.record(
            AuditLogWriter.PendingEntry(
                entityType = AuditScope.USER_LOGIN_ENTITY_TYPE,
                entityId = user.id,
                businessKey = user.username,
                operation = AuditOperation.LOGIN,
                changedFields = emptyMap(),
                actorOverride = AuditLogWriter.Actor(
                    username = user.username,
                    userId = user.id,
                    firstname = user.firstname,
                    lastname = user.lastname,
                ),
            ),
        )
    }
}
