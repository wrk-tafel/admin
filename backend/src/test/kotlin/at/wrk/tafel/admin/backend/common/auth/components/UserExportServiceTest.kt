package at.wrk.tafel.admin.backend.common.auth.components

import at.wrk.tafel.admin.backend.common.pdf.PDFService
import at.wrk.tafel.admin.backend.database.common.audit.AuditLogWriter
import at.wrk.tafel.admin.backend.database.common.audit.AuditOperation
import at.wrk.tafel.admin.backend.database.model.auth.UserRepository
import at.wrk.tafel.admin.backend.security.testUserEntity
import io.mockk.every
import io.mockk.impl.annotations.InjectMockKs
import io.mockk.impl.annotations.RelaxedMockK
import io.mockk.junit5.MockKExtension
import io.mockk.slot
import io.mockk.verify
import org.assertj.core.api.Assertions.assertThat
import org.junit.jupiter.api.Test
import org.junit.jupiter.api.extension.ExtendWith
import java.time.Clock
import java.time.Instant
import java.time.LocalDateTime
import java.time.ZoneId
import java.util.Optional

@ExtendWith(MockKExtension::class)
internal class UserExportServiceTest {

    @RelaxedMockK
    private lateinit var userRepository: UserRepository

    @RelaxedMockK
    private lateinit var auditLogWriter: AuditLogWriter

    private val clock: Clock = Clock.fixed(Instant.parse("2026-08-25T10:00:00Z"), ZoneId.of("UTC"))

    // Real, unmocked - proves the XSL-FO stylesheet actually renders through Apache FOP rather than
    // only checking that some byte array was returned.
    private val pdfService = PDFService()

    @InjectMockKs
    private lateinit var service: UserExportService

    @Test
    fun `export user by username`() {
        val userEntity = testUserEntity.apply {
            lastLogin = LocalDateTime.of(2026, 8, 20, 10, 0)
        }
        every { userRepository.findByUsername("test-username") } returns userEntity

        val result = service.exportUserByUsername("test-username")

        assertThat(result).isNotNull
        assertThat(result?.filename).isEqualTo("benutzerdaten-test-username.pdf")
        assertThat(String(result!!.bytes.copyOfRange(0, 5), Charsets.US_ASCII)).isEqualTo("%PDF-")

        val entrySlot = slot<AuditLogWriter.PendingEntry>()
        verify { auditLogWriter.record(capture(entrySlot)) }
        assertThat(entrySlot.captured.entityType).isEqualTo("User")
        assertThat(entrySlot.captured.entityId).isEqualTo(userEntity.id)
        assertThat(entrySlot.captured.businessKey).isEqualTo("test-username")
        assertThat(entrySlot.captured.operation).isEqualTo(AuditOperation.READ)
        assertThat(entrySlot.captured.changedFields).isEmpty()
    }

    @Test
    fun `export user by username - unknown username returns null`() {
        every { userRepository.findByUsername("unknown") } returns null

        val result = service.exportUserByUsername("unknown")

        assertThat(result).isNull()
        verify(exactly = 0) { auditLogWriter.record(any()) }
    }

    @Test
    fun `export user by id`() {
        val userEntity = testUserEntity
        every { userRepository.findById(0) } returns Optional.of(userEntity)

        val result = service.exportUserById(0)

        assertThat(result).isNotNull
        assertThat(String(result!!.bytes.copyOfRange(0, 5), Charsets.US_ASCII)).isEqualTo("%PDF-")
        verify { auditLogWriter.record(any()) }
    }

    @Test
    fun `export user by id - unknown id returns null`() {
        every { userRepository.findById(999) } returns Optional.empty()

        val result = service.exportUserById(999)

        assertThat(result).isNull()
        verify(exactly = 0) { auditLogWriter.record(any()) }
    }
}
