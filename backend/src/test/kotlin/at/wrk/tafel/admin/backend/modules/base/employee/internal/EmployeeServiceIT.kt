package at.wrk.tafel.admin.backend.modules.base.employee.internal

import at.wrk.tafel.admin.backend.TafelBaseIntegrationTest
import at.wrk.tafel.admin.backend.common.test.TestdataGenerator.createDistribution
import at.wrk.tafel.admin.backend.common.test.TestdataGenerator.createUser
import at.wrk.tafel.admin.backend.common.test.TestdataGenerator.generateRandomLong
import at.wrk.tafel.admin.backend.database.model.auth.UserRepository
import at.wrk.tafel.admin.backend.database.model.base.EmployeeEntity
import at.wrk.tafel.admin.backend.database.model.base.EmployeeRepository
import at.wrk.tafel.admin.backend.database.model.logistics.FoodCollectionEntity
import at.wrk.tafel.admin.backend.database.model.logistics.FoodCollectionRepository
import at.wrk.tafel.admin.backend.database.model.logistics.RouteEntity
import org.assertj.core.api.Assertions.assertThat
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
    private lateinit var foodCollectionRepository: FoodCollectionRepository

    @Autowired
    private lateinit var userRepository: UserRepository

    @Test
    fun `deleting an employee clears the food collection driver and co-driver referencing it, instead of failing`() {
        val employee = EmployeeEntity(personnelNumber = "99999", firstname = "Max", lastname = "Mustermann")
        testEntityManager.persist(employee)
        val coDriver = EmployeeEntity(personnelNumber = "99998", firstname = "Erika", lastname = "Musterfrau")
        testEntityManager.persist(coDriver)

        val user = createUser()
        testEntityManager.persist(user)
        val distribution = createDistribution(user)
        testEntityManager.persist(distribution)
        val route = RouteEntity(number = generateRandomLong().toDouble(), name = "route-${generateRandomLong()}")
        testEntityManager.persist(route)

        val foodCollection = FoodCollectionEntity(distribution = distribution, route = route).apply {
            driver = employee
            this.coDriver = coDriver
        }
        testEntityManager.persist(foodCollection)
        testEntityManager.flush()

        val employeeId = employee.id!!
        val coDriverId = coDriver.id!!
        val foodCollectionId = foodCollection.id!!
        // Clears the persistence context first: the collection is still cached here with its (now
        // stale) in-memory driver reference to the entity about to be deleted, and flushing that
        // stale reference together with the delete would make Hibernate's own referential check trip
        // over it before the DB ever gets to apply `on delete set null`.
        testEntityManager.clear()

        employeeService.deleteEmployee(employeeId)
        employeeService.deleteEmployee(coDriverId)
        testEntityManager.flush()
        testEntityManager.clear()

        assertThat(employeeRepository.findById(employeeId)).isEmpty()
        assertThat(employeeRepository.findById(coDriverId)).isEmpty()
        val reloaded = foodCollectionRepository.findById(foodCollectionId).get()
        assertThat(reloaded.driver).isNull()
        assertThat(reloaded.coDriver).isNull()
    }

    @Test
    fun `deleting an employee does not touch a user account with the same personnel number`() {
        val employee = EmployeeEntity(personnelNumber = "88888", firstname = "Max", lastname = "Mustermann")
        testEntityManager.persist(employee)
        val user = createUser().apply { personnelNumber = "88888" }
        testEntityManager.persist(user)
        testEntityManager.flush()
        val employeeId = employee.id!!
        val userId = user.id!!
        testEntityManager.clear()

        employeeService.deleteEmployee(employeeId)
        testEntityManager.flush()
        testEntityManager.clear()

        assertThat(employeeRepository.findById(employeeId)).isEmpty()
        assertThat(userRepository.findById(userId).get().personnelNumber).isEqualTo("88888")
    }
}
