package at.wrk.tafel.admin.backend.common.auth.components

import at.wrk.tafel.admin.backend.common.pdf.PDFService
import at.wrk.tafel.admin.backend.database.common.audit.AuditLogWriter
import at.wrk.tafel.admin.backend.database.common.audit.AuditOperation
import at.wrk.tafel.admin.backend.database.common.audit.AuditScope
import at.wrk.tafel.admin.backend.database.model.audit.AuditLogEntity
import at.wrk.tafel.admin.backend.database.model.audit.AuditLogRepository
import at.wrk.tafel.admin.backend.database.model.auth.LoginAttemptEntity
import at.wrk.tafel.admin.backend.database.model.auth.LoginAttemptRepository
import at.wrk.tafel.admin.backend.database.model.auth.UserRepository
import at.wrk.tafel.admin.backend.database.model.push.PushNotificationType
import at.wrk.tafel.admin.backend.database.model.push.PushPreferencesEntity
import at.wrk.tafel.admin.backend.database.model.push.PushPreferencesRepository
import at.wrk.tafel.admin.backend.database.model.push.PushSubscriptionEntity
import at.wrk.tafel.admin.backend.database.model.push.PushSubscriptionRepository
import at.wrk.tafel.admin.backend.database.model.push.PushTypePreferenceEntity
import at.wrk.tafel.admin.backend.database.model.push.PushTypePreferenceRepository
import at.wrk.tafel.admin.backend.security.testUserEntity
import io.mockk.every
import io.mockk.impl.annotations.InjectMockKs
import io.mockk.impl.annotations.RelaxedMockK
import io.mockk.junit5.MockKExtension
import io.mockk.slot
import io.mockk.verify
import org.assertj.core.api.Assertions.assertThat
import org.junit.jupiter.api.BeforeEach
import org.junit.jupiter.api.Test
import org.junit.jupiter.api.extension.ExtendWith
import org.springframework.data.domain.PageImpl
import tools.jackson.databind.json.JsonMapper
import java.time.Clock
import java.time.Instant
import java.time.LocalDateTime
import java.time.ZoneId
import java.util.Optional
import java.util.zip.ZipInputStream

@ExtendWith(MockKExtension::class)
internal class UserExportServiceTest {

    @RelaxedMockK
    private lateinit var userRepository: UserRepository

    @RelaxedMockK
    private lateinit var pushSubscriptionRepository: PushSubscriptionRepository

    @RelaxedMockK
    private lateinit var pushPreferencesRepository: PushPreferencesRepository

    @RelaxedMockK
    private lateinit var pushTypePreferenceRepository: PushTypePreferenceRepository

    @RelaxedMockK
    private lateinit var loginAttemptRepository: LoginAttemptRepository

    @RelaxedMockK
    private lateinit var auditLogRepository: AuditLogRepository

    @RelaxedMockK
    private lateinit var auditLogWriter: AuditLogWriter

    private val clock: Clock = Clock.fixed(Instant.parse("2026-08-25T10:00:00Z"), ZoneId.of("UTC"))

    // Real, unmocked - proves the XSL-FO stylesheet actually renders through Apache FOP rather than
    // only checking that some byte array was returned.
    private val pdfService = PDFService()

    private val jsonMapper: JsonMapper = JsonMapper.builder().build()

    @InjectMockKs
    private lateinit var service: UserExportService

    private fun zipEntries(bytes: ByteArray): Map<String, ByteArray> {
        val entries = mutableMapOf<String, ByteArray>()
        ZipInputStream(bytes.inputStream()).use { zip ->
            var entry = zip.nextEntry
            while (entry != null) {
                entries[entry.name] = zip.readBytes()
                entry = zip.nextEntry
            }
        }
        return entries
    }

    @BeforeEach
    fun setup() {
        // Explicit rather than relying on RelaxedMockK's default for a Spring Data `Page` return -
        // `buildLoginRows` calls `.content` on it, which a bare relaxed mock cannot answer safely.
        every {
            auditLogRepository.findAllByBusinessKeyAndEntityTypeInOrderByOccurredAtDescIdDesc(any(), any(), any())
        } returns PageImpl(emptyList())
    }

    @Test
    fun `export user by username`() {
        val userEntity = testUserEntity.apply {
            lastLogin = LocalDateTime.of(2026, 8, 20, 10, 0)
        }
        every { userRepository.findByUsername("test-username") } returns userEntity

        val result = service.exportUserByUsername("test-username")

        assertThat(result).isNotNull
        assertThat(result?.filename).isEqualTo("benutzerdaten-test-username.zip")

        val entries = zipEntries(result!!.bytes)
        assertThat(entries).containsOnlyKeys("datenexport.pdf", "daten.json")
        assertThat(String(entries.getValue("datenexport.pdf").copyOfRange(0, 5), Charsets.US_ASCII)).isEqualTo("%PDF-")

        val entrySlot = slot<AuditLogWriter.PendingEntry>()
        verify { auditLogWriter.record(capture(entrySlot)) }
        assertThat(entrySlot.captured.entityType).isEqualTo("User")
        assertThat(entrySlot.captured.entityId).isEqualTo(userEntity.id)
        assertThat(entrySlot.captured.businessKey).isEqualTo("test-username")
        assertThat(entrySlot.captured.operation).isEqualTo(AuditOperation.READ)
        assertThat(entrySlot.captured.changedFields).isEmpty()
    }

    @Test
    fun `export user by username - renders push devices, preferences, login attempt and login history`() {
        val userEntity = testUserEntity.apply {
            authorities.forEach { it.createdBy = testUserEntity.id }
        }
        every { userRepository.findByUsername("test-username") } returns userEntity
        every { userRepository.findAllById(listOf(testUserEntity.id!!)) } returns listOf(testUserEntity)
        every { pushPreferencesRepository.findByUserId(userEntity.id!!) } returns PushPreferencesEntity().apply { enabled = false }
        every { pushSubscriptionRepository.findAllByUserId(userEntity.id!!) } returns listOf(
            PushSubscriptionEntity().apply {
                endpoint = "https://push.example/abc"
                userAgent = "Mozilla/5.0"
                label = "Diensthandy"
            },
        )
        every { pushTypePreferenceRepository.findAllByUserId(userEntity.id!!) } returns listOf(
            PushTypePreferenceEntity().apply {
                notificationType = PushNotificationType.DISTRIBUTION_STARTED
                enabled = false
            },
        )
        every { loginAttemptRepository.findByUsername("test-username") } returns LoginAttemptEntity(
            username = "test-username",
            lastFailureAt = LocalDateTime.of(2026, 8, 24, 9, 0),
            failureCount = 2,
        )
        every {
            auditLogRepository.findAllByBusinessKeyAndEntityTypeInOrderByOccurredAtDescIdDesc(
                "test-username",
                listOf(AuditScope.USER_LOGIN_ENTITY_TYPE),
                any(),
            )
        } returns PageImpl(
            listOf(AuditLogEntity(occurredAt = LocalDateTime.of(2026, 8, 20, 10, 0), entityType = AuditScope.USER_LOGIN_ENTITY_TYPE, operation = AuditOperation.LOGIN)),
        )

        val result = service.exportUserByUsername("test-username")

        assertThat(result).isNotNull
        val entries = zipEntries(result!!.bytes)
        assertThat(entries).containsOnlyKeys("datenexport.pdf", "daten.json")
        assertThat(String(entries.getValue("datenexport.pdf").copyOfRange(0, 5), Charsets.US_ASCII)).isEqualTo("%PDF-")

        val jsonNode = jsonMapper.readTree(entries.getValue("daten.json"))
        assertThat(jsonNode.get("pushDevices").get(0).get("label").asString()).isEqualTo("Diensthandy")
        assertThat(jsonNode.get("pushTypePreferences").get(0).get("enabled").asString()).isEqualTo("Nein")
        assertThat(jsonNode.get("loginAttempt").size()).isGreaterThan(0)
        assertThat(jsonNode.get("logins").size()).isGreaterThan(0)
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
        assertThat(result?.filename).isEqualTo("benutzerdaten-${userEntity.username}.zip")
        val entries = zipEntries(result!!.bytes)
        assertThat(entries).containsOnlyKeys("datenexport.pdf", "daten.json")
        assertThat(String(entries.getValue("datenexport.pdf").copyOfRange(0, 5), Charsets.US_ASCII)).isEqualTo("%PDF-")
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
