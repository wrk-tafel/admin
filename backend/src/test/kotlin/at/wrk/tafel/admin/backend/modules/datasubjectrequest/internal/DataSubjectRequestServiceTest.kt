package at.wrk.tafel.admin.backend.modules.datasubjectrequest.internal

import at.wrk.tafel.admin.backend.common.auth.components.TafelUserDetailsManager
import at.wrk.tafel.admin.backend.common.auth.components.UserExportFileResult
import at.wrk.tafel.admin.backend.common.auth.components.UserExportService
import at.wrk.tafel.admin.backend.common.auth.model.TafelJwtAuthentication
import at.wrk.tafel.admin.backend.common.export.ExportFileResult
import at.wrk.tafel.admin.backend.config.properties.TafelAdminProperties
import at.wrk.tafel.admin.backend.database.model.auth.EmployeeUserAccountProjection
import at.wrk.tafel.admin.backend.database.model.auth.UserEntity
import at.wrk.tafel.admin.backend.database.model.auth.UserRepository
import at.wrk.tafel.admin.backend.database.model.base.EmployeeEntity
import at.wrk.tafel.admin.backend.database.model.base.EmployeeRepository
import at.wrk.tafel.admin.backend.database.model.household.HouseholdEntity
import at.wrk.tafel.admin.backend.database.model.household.HouseholdRepository
import at.wrk.tafel.admin.backend.database.model.person.PersonEntity
import at.wrk.tafel.admin.backend.modules.base.country.testCountry1
import at.wrk.tafel.admin.backend.modules.base.employee.EmployeeDataSubjectFacade
import at.wrk.tafel.admin.backend.modules.base.exception.BusinessRuleException
import at.wrk.tafel.admin.backend.modules.base.exception.NotFoundException
import at.wrk.tafel.admin.backend.modules.base.exception.TafelApiException
import at.wrk.tafel.admin.backend.modules.datasubjectrequest.DataSubjectDeleteOutcome
import at.wrk.tafel.admin.backend.modules.datasubjectrequest.DataSubjectDeleteResultItem
import at.wrk.tafel.admin.backend.modules.datasubjectrequest.DataSubjectMatch
import at.wrk.tafel.admin.backend.modules.datasubjectrequest.DataSubjectMatchItem
import at.wrk.tafel.admin.backend.modules.datasubjectrequest.DataSubjectMatchType
import at.wrk.tafel.admin.backend.modules.household.HouseholdDataSubjectFacade
import io.mockk.every
import io.mockk.impl.annotations.InjectMockKs
import io.mockk.impl.annotations.RelaxedMockK
import io.mockk.junit5.MockKExtension
import io.mockk.verify
import org.assertj.core.api.Assertions.assertThat
import org.junit.jupiter.api.AfterEach
import org.junit.jupiter.api.Test
import org.junit.jupiter.api.assertThrows
import org.junit.jupiter.api.extension.ExtendWith
import org.springframework.data.domain.PageImpl
import org.springframework.data.domain.PageRequest
import org.springframework.data.jpa.domain.Specification
import org.springframework.http.HttpStatus
import org.springframework.security.core.authority.SimpleGrantedAuthority
import org.springframework.security.core.context.SecurityContextHolder
import org.springframework.security.core.context.SecurityContextImpl
import java.time.LocalDate
import java.util.zip.ZipEntry
import java.util.zip.ZipInputStream
import java.util.zip.ZipOutputStream

@ExtendWith(MockKExtension::class)
internal class DataSubjectRequestServiceTest {

    @RelaxedMockK
    private lateinit var householdRepository: HouseholdRepository

    @RelaxedMockK
    private lateinit var userRepository: UserRepository

    @RelaxedMockK
    private lateinit var employeeRepository: EmployeeRepository

    @RelaxedMockK
    private lateinit var householdFacade: HouseholdDataSubjectFacade

    @RelaxedMockK
    private lateinit var employeeFacade: EmployeeDataSubjectFacade

    @RelaxedMockK
    private lateinit var userExportService: UserExportService

    @RelaxedMockK
    private lateinit var userDetailsManager: TafelUserDetailsManager

    private var tafelAdminProperties: TafelAdminProperties = TafelAdminProperties()

    @InjectMockKs
    private lateinit var service: DataSubjectRequestService

    @AfterEach
    fun afterEach() {
        SecurityContextHolder.clearContext()
    }

    private fun authenticateWith(vararg authorities: String) {
        SecurityContextHolder.setContext(
            SecurityContextImpl(
                TafelJwtAuthentication(
                    tokenValue = "TOKEN",
                    username = "tester",
                    authorities = authorities.map { SimpleGrantedAuthority(it) },
                ),
            ),
        )
    }

    private fun zipOf(vararg entries: Pair<String, String>): ByteArray {
        val buffer = java.io.ByteArrayOutputStream()
        ZipOutputStream(buffer).use { zip ->
            entries.forEach { (name, content) ->
                zip.putNextEntry(ZipEntry(name))
                zip.write(content.toByteArray())
                zip.closeEntry()
            }
        }
        return buffer.toByteArray()
    }

    private fun zipEntryNames(bytes: ByteArray): List<String> {
        val names = mutableListOf<String>()
        ZipInputStream(bytes.inputStream()).use { zip ->
            generateSequence { zip.nextEntry }.forEach { names += it.name }
        }
        return names
    }

    @Test
    fun `search - blank input returns no matches without querying`() {
        authenticateWith("DATA_SUBJECT_REQUESTS", "CUSTOMER", "USER_MANAGEMENT", "SETTINGS")

        val result = service.search("   ")

        assertThat(result.items).isEmpty()
        assertThat(result.truncated).isFalse()
        verify(exactly = 0) { householdRepository.findAll(any<Specification<HouseholdEntity>>(), any<PageRequest>()) }
        verify(exactly = 0) { userRepository.findAll(any<Specification<UserEntity>>(), any<PageRequest>()) }
        verify(exactly = 0) { employeeRepository.findBySearchInput(any(), any()) }
    }

    @Test
    fun `search - combines household, user and employee-without-account matches`() {
        authenticateWith("DATA_SUBJECT_REQUESTS", "CUSTOMER", "USER_MANAGEMENT", "SETTINGS")

        val household = HouseholdEntity(householdId = 1234, validUntil = LocalDate.now(), locked = false)
        household.mainPerson = PersonEntity(household = household, country = testCountry1, isMainPerson = true).apply {
            firstname = "Max"
            lastname = "Mustermann"
        }
        every { householdRepository.findAll(any<Specification<HouseholdEntity>>(), any<PageRequest>()) } returns PageImpl(listOf(household))

        val employeeForAccount = EmployeeEntity(personnelNumber = "00001", firstname = "Erika", lastname = "Musterfrau").apply { id = 10 }
        val userEntity = UserEntity(username = "emusterfrau", password = "hash", employee = employeeForAccount, enabled = true).apply { id = 42 }
        every { userRepository.findAll(any<Specification<UserEntity>>(), any<PageRequest>()) } returns PageImpl(listOf(userEntity))

        val employeeWithAccount = employeeForAccount
        val employeeWithoutAccount = EmployeeEntity(personnelNumber = "00002", firstname = "Fahrer", lastname = "Zwei").apply { id = 11 }
        every { employeeRepository.findBySearchInput("muster", any<PageRequest>()) } returns
            PageImpl(listOf(employeeWithAccount, employeeWithoutAccount))
        every { userRepository.findAccountsByEmployeeIds(listOf(10, 11)) } returns
            listOf(object : EmployeeUserAccountProjection {
                override val employeeId = 10L
                override val userId = 42L
                override val username = "emusterfrau"
            })

        val result = service.search(" Muster ")

        assertThat(result.truncated).isFalse()
        assertThat(result.items).containsExactlyInAnyOrder(
            DataSubjectMatchItem(
                type = DataSubjectMatchType.CUSTOMER,
                id = 1234,
                businessKey = "1234",
                name = "Mustermann Max",
            ),
            DataSubjectMatchItem(
                type = DataSubjectMatchType.USER_ACCOUNT,
                id = 42,
                businessKey = "emusterfrau",
                name = "Musterfrau Erika",
            ),
            DataSubjectMatchItem(
                type = DataSubjectMatchType.EMPLOYEE_WITHOUT_ACCOUNT,
                id = 11,
                businessKey = "00002",
                name = "Zwei Fahrer",
            ),
        )
    }

    @Test
    fun `search - no employee candidates match`() {
        authenticateWith("DATA_SUBJECT_REQUESTS", "CUSTOMER", "USER_MANAGEMENT", "SETTINGS")

        every { householdRepository.findAll(any<Specification<HouseholdEntity>>(), any<PageRequest>()) } returns PageImpl(emptyList())
        every { userRepository.findAll(any<Specification<UserEntity>>(), any<PageRequest>()) } returns PageImpl(emptyList())
        every { employeeRepository.findBySearchInput("nobody", any<PageRequest>()) } returns PageImpl(emptyList())

        val result = service.search("nobody")

        assertThat(result.items).isEmpty()
        verify(exactly = 0) { userRepository.findAccountsByEmployeeIds(any()) }
    }

    @Test
    fun `search - only queries areas the caller holds the permission for`() {
        authenticateWith("DATA_SUBJECT_REQUESTS", "CUSTOMER")

        every { householdRepository.findAll(any<Specification<HouseholdEntity>>(), any<PageRequest>()) } returns PageImpl(emptyList())

        val result = service.search("muster")

        assertThat(result.items).isEmpty()
        verify(exactly = 0) { userRepository.findAll(any<Specification<UserEntity>>(), any<PageRequest>()) }
        verify(exactly = 0) { employeeRepository.findBySearchInput(any(), any()) }
    }

    @Test
    fun `search - reports truncation when an area holds more matches than the per-area cap`() {
        authenticateWith("DATA_SUBJECT_REQUESTS", "CUSTOMER", "USER_MANAGEMENT", "SETTINGS")

        every { householdRepository.findAll(any<Specification<HouseholdEntity>>(), any<PageRequest>()) } returns
            PageImpl(emptyList(), PageRequest.of(0, 20), 21)
        every { userRepository.findAll(any<Specification<UserEntity>>(), any<PageRequest>()) } returns PageImpl(emptyList())
        every { employeeRepository.findBySearchInput("muster", any<PageRequest>()) } returns PageImpl(emptyList())

        val result = service.search("muster")

        assertThat(result.truncated).isTrue()
    }

    @Test
    fun `export - throws when no matches selected`() {
        assertThrows<BusinessRuleException> { service.export(emptyList()) }
    }

    @Test
    fun `export - throws forbidden when caller lacks the area permission`() {
        authenticateWith("DATA_SUBJECT_REQUESTS")

        val exception = assertThrows<TafelApiException> {
            service.export(listOf(DataSubjectMatch(type = DataSubjectMatchType.CUSTOMER, id = 1)))
        }

        assertThat(exception.body.status).isEqualTo(HttpStatus.FORBIDDEN.value())
        verify(exactly = 0) { householdFacade.export(any()) }
    }

    @Test
    fun `export - unknown household match throws not found`() {
        authenticateWith("DATA_SUBJECT_REQUESTS", "CUSTOMER")
        every { householdFacade.export(1) } returns null

        assertThrows<NotFoundException> {
            service.export(listOf(DataSubjectMatch(type = DataSubjectMatchType.CUSTOMER, id = 1)))
        }
    }

    @Test
    fun `export - unknown user match throws not found`() {
        authenticateWith("DATA_SUBJECT_REQUESTS", "USER_MANAGEMENT")
        every { userExportService.exportUserById(2) } returns null

        assertThrows<NotFoundException> {
            service.export(listOf(DataSubjectMatch(type = DataSubjectMatchType.USER_ACCOUNT, id = 2)))
        }
    }

    @Test
    fun `export - unknown employee match throws not found`() {
        authenticateWith("DATA_SUBJECT_REQUESTS", "SETTINGS")
        every { employeeFacade.export(3) } returns null

        assertThrows<NotFoundException> {
            service.export(listOf(DataSubjectMatch(type = DataSubjectMatchType.EMPLOYEE_WITHOUT_ACCOUNT, id = 3)))
        }
    }

    @Test
    fun `export - combines a household zip, a user pdf and an employee pdf into one archive`() {
        authenticateWith("DATA_SUBJECT_REQUESTS", "CUSTOMER", "USER_MANAGEMENT", "SETTINGS")

        every { householdFacade.export(1) } returns ExportFileResult(
            filename = "datenexport-mustermann-max-1.zip",
            bytes = zipOf("datenexport.pdf" to "household-pdf"),
        )
        every { userExportService.exportUserById(2) } returns UserExportFileResult(
            filename = "benutzerdaten-emusterfrau.pdf",
            bytes = "user-pdf".toByteArray(),
        )
        every { employeeFacade.export(3) } returns ExportFileResult(
            filename = "mitarbeiterdaten-00002.pdf",
            bytes = "employee-pdf".toByteArray(),
        )

        val result = service.export(
            listOf(
                DataSubjectMatch(type = DataSubjectMatchType.CUSTOMER, id = 1),
                DataSubjectMatch(type = DataSubjectMatchType.USER_ACCOUNT, id = 2),
                DataSubjectMatch(type = DataSubjectMatchType.EMPLOYEE_WITHOUT_ACCOUNT, id = 3),
            ),
        )

        assertThat(result.filename).isEqualTo("datenauskunft.zip")
        assertThat(zipEntryNames(result.bytes)).containsExactlyInAnyOrder(
            "kunde-1/datenexport.pdf",
            "benutzerkonto-2/benutzerdaten-emusterfrau.pdf",
            "mitarbeiter-3/mitarbeiterdaten-00002.pdf",
        )
    }

    @Test
    fun `delete - throws when no matches selected`() {
        assertThrows<BusinessRuleException> { service.delete(emptyList()) }
    }

    @Test
    fun `delete - throws forbidden when caller lacks the area permission`() {
        authenticateWith("DATA_SUBJECT_REQUESTS")

        assertThrows<TafelApiException> {
            service.delete(listOf(DataSubjectMatch(type = DataSubjectMatchType.EMPLOYEE_WITHOUT_ACCOUNT, id = 1)))
        }
        verify(exactly = 0) { employeeFacade.delete(any()) }
    }

    @Test
    fun `delete - reports an outcome per match`() {
        authenticateWith("DATA_SUBJECT_REQUESTS", "CUSTOMER", "USER_MANAGEMENT", "SETTINGS")

        every { householdFacade.delete(1) } returns true
        every { userRepository.findById(2) } returns java.util.Optional.empty()
        every { userDetailsManager.deleteUserById(2) } returns false
        every { employeeRepository.existsById(3) } returns true

        val result = service.delete(
            listOf(
                DataSubjectMatch(type = DataSubjectMatchType.CUSTOMER, id = 1),
                DataSubjectMatch(type = DataSubjectMatchType.USER_ACCOUNT, id = 2),
                DataSubjectMatch(type = DataSubjectMatchType.EMPLOYEE_WITHOUT_ACCOUNT, id = 3),
            ),
        )

        assertThat(result.results).containsExactlyInAnyOrder(
            DataSubjectDeleteResultItem(
                match = DataSubjectMatch(type = DataSubjectMatchType.CUSTOMER, id = 1),
                outcome = DataSubjectDeleteOutcome.DELETED,
            ),
            DataSubjectDeleteResultItem(
                match = DataSubjectMatch(type = DataSubjectMatchType.USER_ACCOUNT, id = 2),
                outcome = DataSubjectDeleteOutcome.NOT_FOUND,
            ),
            DataSubjectDeleteResultItem(
                match = DataSubjectMatch(type = DataSubjectMatchType.EMPLOYEE_WITHOUT_ACCOUNT, id = 3),
                outcome = DataSubjectDeleteOutcome.DELETED,
            ),
        )
        verify { employeeFacade.delete(3) }
    }

    @Test
    fun `delete - employee not found is reported without calling delete`() {
        authenticateWith("DATA_SUBJECT_REQUESTS", "SETTINGS")
        every { employeeRepository.existsById(99) } returns false

        val result = service.delete(listOf(DataSubjectMatch(type = DataSubjectMatchType.EMPLOYEE_WITHOUT_ACCOUNT, id = 99)))

        assertThat(result.results.single().outcome).isEqualTo(DataSubjectDeleteOutcome.NOT_FOUND)
        verify(exactly = 0) { employeeFacade.delete(any()) }
    }

    @Test
    fun `delete - user account deletion also deletes an unreferenced linked employee`() {
        authenticateWith("DATA_SUBJECT_REQUESTS", "USER_MANAGEMENT")

        val employee = EmployeeEntity(personnelNumber = "00001", firstname = "Erika", lastname = "Musterfrau").apply { id = 10 }
        val userEntity = UserEntity(username = "emusterfrau", password = "hash", employee = employee, enabled = true).apply { id = 42 }
        every { userRepository.findById(42) } returns java.util.Optional.of(userEntity)
        every { userDetailsManager.deleteUserById(42) } returns true
        every { employeeRepository.isReferencedOutsideUserAccounts(10) } returns false

        val result = service.delete(listOf(DataSubjectMatch(type = DataSubjectMatchType.USER_ACCOUNT, id = 42)))

        assertThat(result.results.single().outcome).isEqualTo(DataSubjectDeleteOutcome.DELETED)
        verify { employeeFacade.delete(10) }
    }

    @Test
    fun `delete - user account deletion keeps a linked employee still referenced elsewhere`() {
        authenticateWith("DATA_SUBJECT_REQUESTS", "USER_MANAGEMENT")

        val employee = EmployeeEntity(personnelNumber = "00001", firstname = "Erika", lastname = "Musterfrau").apply { id = 10 }
        val userEntity = UserEntity(username = "emusterfrau", password = "hash", employee = employee, enabled = true).apply { id = 42 }
        every { userRepository.findById(42) } returns java.util.Optional.of(userEntity)
        every { userDetailsManager.deleteUserById(42) } returns true
        every { employeeRepository.isReferencedOutsideUserAccounts(10) } returns true

        val result = service.delete(listOf(DataSubjectMatch(type = DataSubjectMatchType.USER_ACCOUNT, id = 42)))

        assertThat(result.results.single().outcome).isEqualTo(DataSubjectDeleteOutcome.DELETED)
        verify(exactly = 0) { employeeFacade.delete(any()) }
    }

    @Test
    fun `delete - unknown user account match leaves any linked employee alone`() {
        authenticateWith("DATA_SUBJECT_REQUESTS", "USER_MANAGEMENT")
        every { userRepository.findById(42) } returns java.util.Optional.empty()
        every { userDetailsManager.deleteUserById(42) } returns false

        val result = service.delete(listOf(DataSubjectMatch(type = DataSubjectMatchType.USER_ACCOUNT, id = 42)))

        assertThat(result.results.single().outcome).isEqualTo(DataSubjectDeleteOutcome.NOT_FOUND)
        verify(exactly = 0) { employeeFacade.delete(any()) }
    }
}
