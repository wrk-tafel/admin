package at.wrk.tafel.admin.backend.modules.base.employee.internal

import at.wrk.tafel.admin.backend.common.pdf.PDFService
import at.wrk.tafel.admin.backend.database.common.audit.AuditLogWriter
import at.wrk.tafel.admin.backend.database.common.audit.AuditOperation
import at.wrk.tafel.admin.backend.database.model.auth.UserRepository
import at.wrk.tafel.admin.backend.database.model.base.EmployeeEntity
import at.wrk.tafel.admin.backend.database.model.base.EmployeeRepository
import at.wrk.tafel.admin.backend.modules.base.exception.ConflictException
import io.mockk.every
import io.mockk.impl.annotations.InjectMockKs
import io.mockk.impl.annotations.RelaxedMockK
import io.mockk.junit5.MockKExtension
import io.mockk.slot
import io.mockk.verify
import org.assertj.core.api.Assertions.assertThat
import org.junit.jupiter.api.Test
import org.junit.jupiter.api.assertThrows
import org.junit.jupiter.api.extension.ExtendWith
import org.springframework.data.repository.findByIdOrNull
import java.time.Clock
import java.time.Instant
import java.time.LocalDateTime
import java.time.ZoneId

@ExtendWith(MockKExtension::class)
internal class EmployeeExportServiceTest {

    @RelaxedMockK
    private lateinit var employeeRepository: EmployeeRepository

    @RelaxedMockK
    private lateinit var userRepository: UserRepository

    @RelaxedMockK
    private lateinit var auditLogWriter: AuditLogWriter

    private val clock: Clock = Clock.fixed(Instant.parse("2026-08-25T10:00:00Z"), ZoneId.of("UTC"))

    // Real, unmocked - proves the XSL-FO stylesheet actually renders through Apache FOP rather than
    // only checking that some byte array was returned.
    private val pdfService = PDFService()

    @InjectMockKs
    private lateinit var service: EmployeeExportService

    @Test
    fun `export employee by id`() {
        val employeeEntity = EmployeeEntity(personnelNumber = "02000", firstname = "Fahrer", lastname = "Eins").apply {
            id = 5
            createdAt = LocalDateTime.of(2026, 1, 10, 8, 30)
        }
        every { employeeRepository.findByIdOrNull(5) } returns employeeEntity

        val result = service.exportEmployeeById(5)

        assertThat(result).isNotNull
        assertThat(result?.filename).isEqualTo("mitarbeiterdaten-02000.pdf")
        assertThat(String(result!!.bytes.copyOfRange(0, 5), Charsets.US_ASCII)).isEqualTo("%PDF-")

        val entrySlot = slot<AuditLogWriter.PendingEntry>()
        verify { auditLogWriter.record(capture(entrySlot)) }
        assertThat(entrySlot.captured.entityType).isEqualTo("Employee")
        assertThat(entrySlot.captured.entityId).isEqualTo(employeeEntity.id)
        assertThat(entrySlot.captured.businessKey).isEqualTo("02000")
        assertThat(entrySlot.captured.operation).isEqualTo(AuditOperation.READ)
        assertThat(entrySlot.captured.changedFields).isEmpty()
    }

    @Test
    fun `export employee by id - unknown id returns null`() {
        every { employeeRepository.findByIdOrNull(999) } returns null

        val result = service.exportEmployeeById(999)

        assertThat(result).isNull()
        verify(exactly = 0) { auditLogWriter.record(any()) }
    }

    @Test
    fun `export employee by id - refuses when a user account is linked`() {
        val employeeEntity = EmployeeEntity(personnelNumber = "00001", firstname = "Max", lastname = "Mustermann").apply { id = 7 }
        every { employeeRepository.findByIdOrNull(7) } returns employeeEntity
        every { userRepository.existsByEmployeeId(7) } returns true

        val exception = assertThrows<ConflictException> { service.exportEmployeeById(7) }

        assertThat(exception.body.detail).isEqualTo("Mitarbeiter hat ein Benutzerkonto - Datenexport erfolgt über das Benutzerkonto!")
        verify(exactly = 0) { auditLogWriter.record(any()) }
    }
}
