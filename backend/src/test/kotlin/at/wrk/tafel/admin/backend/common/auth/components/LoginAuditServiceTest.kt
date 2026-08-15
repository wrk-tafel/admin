package at.wrk.tafel.admin.backend.common.auth.components

import at.wrk.tafel.admin.backend.common.auth.model.TafelUser
import at.wrk.tafel.admin.backend.database.common.audit.AuditLogWriter
import at.wrk.tafel.admin.backend.database.common.audit.AuditOperation
import at.wrk.tafel.admin.backend.database.common.audit.AuditScope
import at.wrk.tafel.admin.backend.database.model.auth.UserRepository
import io.mockk.every
import io.mockk.mockk
import io.mockk.slot
import io.mockk.verify
import org.assertj.core.api.Assertions.assertThat
import org.junit.jupiter.api.Test
import java.time.Clock
import java.time.Instant
import java.time.LocalDateTime
import java.time.ZoneOffset

internal class LoginAuditServiceTest {

    private val clock = Clock.fixed(Instant.parse("2026-01-01T10:00:00Z"), ZoneOffset.UTC)

    private val userRepository: UserRepository = mockk(relaxed = true)
    private val auditLogWriter: AuditLogWriter = mockk(relaxed = true)

    private val service = LoginAuditService(userRepository, auditLogWriter, clock)

    private val testUser = TafelUser(
        id = 42,
        username = "user",
        password = "encoded-password",
        enabled = true,
        personnelNumber = "0001",
        firstname = "First",
        lastname = "Last",
        authorities = emptyList(),
        passwordChangeRequired = false,
    )

    @Test
    fun `recordLogin moves last_login forward`() {
        service.recordLogin(testUser)

        verify { userRepository.updateLastLogin("user", LocalDateTime.now(clock)) }
    }

    @Test
    fun `recordLogin writes an audit entry attributed to the logging-in user`() {
        val entrySlot = slot<AuditLogWriter.PendingEntry>()
        every { auditLogWriter.record(capture(entrySlot)) } returns Unit

        service.recordLogin(testUser)

        val entry = entrySlot.captured
        assertThat(entry.entityType).isEqualTo(AuditScope.USER_LOGIN_ENTITY_TYPE)
        assertThat(entry.entityId).isEqualTo(42)
        assertThat(entry.businessKey).isEqualTo("user")
        assertThat(entry.operation).isEqualTo(AuditOperation.LOGIN)
        assertThat(entry.changedFields).isEmpty()
        assertThat(entry.actorOverride).isEqualTo(
            AuditLogWriter.Actor(username = "user", userId = 42, firstname = "First", lastname = "Last"),
        )
    }
}
