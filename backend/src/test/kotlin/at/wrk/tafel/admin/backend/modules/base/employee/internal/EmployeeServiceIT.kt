package at.wrk.tafel.admin.backend.modules.base.employee.internal

import at.wrk.tafel.admin.backend.TafelBaseIntegrationTest
import at.wrk.tafel.admin.backend.common.test.TestdataGenerator.createCountry
import at.wrk.tafel.admin.backend.common.test.TestdataGenerator.createHousehold
import at.wrk.tafel.admin.backend.database.model.base.EmployeeEntity
import at.wrk.tafel.admin.backend.database.model.base.EmployeeRepository
import at.wrk.tafel.admin.backend.database.model.household.HouseholdNoteEntity
import at.wrk.tafel.admin.backend.database.model.household.HouseholdNoteRepository
import at.wrk.tafel.admin.backend.database.model.household.HouseholdRepository
import at.wrk.tafel.admin.backend.database.model.staticdata.CountryEntity
import org.assertj.core.api.Assertions.assertThat
import org.junit.jupiter.api.BeforeEach
import org.junit.jupiter.api.Test
import org.springframework.beans.factory.annotation.Autowired
import org.springframework.boot.jpa.test.autoconfigure.TestEntityManager
import org.springframework.transaction.annotation.Transactional

/**
 * Verifies the real Postgres FK behavior `R__00106_employee_delete_set_null.sql` sets up, not just
 * that the migration itself applies cleanly - a wrong column/table in that migration would still let
 * every other IT boot, since Flyway does not know which FK is meant to end up `on delete set null`.
 */
@Transactional
class EmployeeServiceIT : TafelBaseIntegrationTest() {

    @Autowired
    private lateinit var testEntityManager: TestEntityManager

    @Autowired
    private lateinit var employeeService: EmployeeService

    @Autowired
    private lateinit var employeeRepository: EmployeeRepository

    @Autowired
    private lateinit var householdRepository: HouseholdRepository

    @Autowired
    private lateinit var householdNoteRepository: HouseholdNoteRepository

    private lateinit var testCountry: CountryEntity

    @BeforeEach
    fun beforeEach() {
        testCountry = createCountry()
        testEntityManager.persist(testCountry)
    }

    @Test
    fun `deleting an employee clears the household issuer and note author referencing it, instead of failing`() {
        val employee = EmployeeEntity(personnelNumber = "99999", firstname = "Max", lastname = "Mustermann")
        testEntityManager.persist(employee)

        val household = createHousehold(employee, testCountry)
        testEntityManager.persist(household)
        testEntityManager.flush()
        household.mainPerson = household.persons.first { it.isMainPerson }
        testEntityManager.persist(household)

        val note = HouseholdNoteEntity(household = household, note = "test note").apply { this.employee = employee }
        testEntityManager.persist(note)
        testEntityManager.flush()

        val employeeId = employee.id!!
        val householdId = household.id!!
        val noteId = note.id!!
        // Clears the persistence context first: household/note are still cached here with their
        // (now stale) in-memory `issuer`/`employee` reference to the entity about to be deleted, and
        // flushing that stale reference together with the delete would make Hibernate's own
        // referential check trip over it before the DB ever gets to apply `on delete set null`.
        testEntityManager.clear()

        employeeService.deleteEmployee(employeeId)
        testEntityManager.flush()
        testEntityManager.clear()

        assertThat(employeeRepository.findById(employeeId)).isEmpty()
        assertThat(householdRepository.findById(householdId).get().issuer).isNull()
        assertThat(householdNoteRepository.findById(noteId).get().employee).isNull()
    }
}
