package at.wrk.tafel.admin.backend.modules.base.employee.internal

import at.wrk.tafel.admin.backend.TafelBaseIntegrationTest
import at.wrk.tafel.admin.backend.common.test.TestdataGenerator.createDistribution
import at.wrk.tafel.admin.backend.common.test.TestdataGenerator.createUser
import at.wrk.tafel.admin.backend.common.test.TestdataGenerator.generateRandomLong
import at.wrk.tafel.admin.backend.database.model.base.EmployeeEntity
import at.wrk.tafel.admin.backend.database.model.base.EmployeeRepository
import at.wrk.tafel.admin.backend.database.model.logistics.FoodCollectionEntity
import at.wrk.tafel.admin.backend.database.model.logistics.RouteEntity
import org.assertj.core.api.Assertions.assertThat
import org.junit.jupiter.api.Test
import org.springframework.beans.factory.annotation.Autowired
import org.springframework.boot.jpa.test.autoconfigure.TestEntityManager
import org.springframework.jdbc.core.JdbcTemplate
import org.springframework.transaction.annotation.Transactional
import java.time.LocalDateTime

/**
 * The employee retention rule against real Postgres (GDPR gap G13): an employee is a deletion
 * candidate when their last use - the newest food collection naming them as driver or co-driver, or
 * their own `created_at` when none ever did - lies before the cutoff. The row's own `updated_at` does
 * not matter, and a food collection alone no longer protects an employee, only a recent one does.
 *
 * `created_at` and `updated_at` are Hibernate-generated, so the fixtures are backdated with SQL. The
 * cutoff sits in the year 2000, which no row of any other test class reaches, so asserting by id is
 * safe against whatever else the shared database holds.
 */
@Transactional
class EmployeeRetentionRuleIT : TafelBaseIntegrationTest() {

    private companion object {
        val CUTOFF: LocalDateTime = LocalDateTime.of(2000, 6, 1, 0, 0)
        val BEFORE_CUTOFF: LocalDateTime = LocalDateTime.of(2000, 1, 1, 0, 0)
        val LONG_BEFORE_CUTOFF: LocalDateTime = LocalDateTime.of(1999, 1, 1, 0, 0)
        val AFTER_CUTOFF: LocalDateTime = LocalDateTime.of(2000, 12, 1, 0, 0)
    }

    @Autowired
    private lateinit var testEntityManager: TestEntityManager

    @Autowired
    private lateinit var employeeRepository: EmployeeRepository

    @Autowired
    private lateinit var employeeService: EmployeeService

    @Autowired
    private lateinit var jdbcTemplate: JdbcTemplate

    @Test
    fun `an employee never used and created before the cutoff is a candidate`() {
        val employee = givenEmployee(createdAt = BEFORE_CUTOFF)

        assertThat(candidates()).contains(employee)
    }

    @Test
    fun `an employee never used and created after the cutoff is not a candidate`() {
        val employee = givenEmployee(createdAt = AFTER_CUTOFF)

        assertThat(candidates()).doesNotContain(employee)
    }

    @Test
    fun `an employee who drove a collection updated after the cutoff is not a candidate, however old their own row is`() {
        val driver = givenEmployee(createdAt = BEFORE_CUTOFF)
        val coDriver = givenEmployee(createdAt = BEFORE_CUTOFF)
        givenFoodCollection(driver = driver, coDriver = coDriver, updatedAt = AFTER_CUTOFF)
        jdbcTemplate.update("UPDATE employees SET updated_at = ? WHERE id in (?, ?)", BEFORE_CUTOFF, driver, coDriver)

        assertThat(candidates()).doesNotContain(driver, coDriver)
    }

    @Test
    fun `an employee whose newest collection is older than the cutoff is a candidate, and deleting them clears the driver reference`() {
        val driver = givenEmployee(createdAt = AFTER_CUTOFF)
        val coDriver = givenEmployee(createdAt = AFTER_CUTOFF)
        val olderCollection = givenFoodCollection(driver = driver, coDriver = null, updatedAt = LONG_BEFORE_CUTOFF)
        val newestCollection = givenFoodCollection(driver = driver, coDriver = coDriver, updatedAt = BEFORE_CUTOFF)

        // their own row was created after the cutoff - it is the collections that decide, and the
        // newest of them is still before it
        assertThat(candidates()).contains(driver, coDriver)

        // Clears the persistence context first: the collections are still cached with their (now
        // stale) in-memory driver reference, and flushing that together with the delete would trip
        // Hibernate's own check before the database applies `on delete set null`.
        testEntityManager.clear()
        employeeService.deleteEmployee(driver)
        employeeService.deleteEmployee(coDriver)
        testEntityManager.flush()
        testEntityManager.clear()

        assertThat(employeeRepository.findById(driver)).isEmpty
        assertThat(employeeRepository.findById(coDriver)).isEmpty
        assertThat(referenceOf("driver_employee_id", olderCollection)).isNull()
        assertThat(referenceOf("driver_employee_id", newestCollection)).isNull()
        assertThat(referenceOf("co_driver_employee_id", newestCollection)).isNull()
        assertThat(rowExists(olderCollection)).isTrue()
        assertThat(rowExists(newestCollection)).isTrue()
    }

    @Test
    fun `a newer collection keeps an employee out even when an older one would let them age out`() {
        val driver = givenEmployee(createdAt = BEFORE_CUTOFF)
        givenFoodCollection(driver = driver, coDriver = null, updatedAt = BEFORE_CUTOFF)
        givenFoodCollection(driver = driver, coDriver = null, updatedAt = AFTER_CUTOFF)

        assertThat(candidates()).doesNotContain(driver)
    }

    private fun candidates(): List<Long> = employeeRepository.findExpiredEmployeeIdsSkipLocked(CUTOFF)

    private fun givenEmployee(createdAt: LocalDateTime): Long {
        val number = generateRandomLong()
        val employee = EmployeeEntity(personnelNumber = "ret-$number", firstname = "first", lastname = "last")
        testEntityManager.persist(employee)
        testEntityManager.flush()
        jdbcTemplate.update("UPDATE employees SET created_at = ? WHERE id = ?", createdAt, employee.id)
        return employee.id!!
    }

    private fun givenFoodCollection(driver: Long?, coDriver: Long?, updatedAt: LocalDateTime): Long {
        val number = generateRandomLong()
        val user = createUser()
        testEntityManager.persist(user)
        val distribution = createDistribution(user)
        testEntityManager.persist(distribution)
        val route = RouteEntity(number = number.toDouble(), name = "route-$number")
        testEntityManager.persist(route)
        val foodCollection = FoodCollectionEntity(distribution = distribution, route = route).apply {
            this.driver = driver?.let { employeeRepository.getReferenceById(it) }
            this.coDriver = coDriver?.let { employeeRepository.getReferenceById(it) }
        }
        testEntityManager.persist(foodCollection)
        testEntityManager.flush()
        jdbcTemplate.update("UPDATE food_collections SET updated_at = ? WHERE id = ?", updatedAt, foodCollection.id)
        return foodCollection.id!!
    }

    private fun referenceOf(column: String, foodCollectionId: Long): Long? = jdbcTemplate.queryForObject("select $column from food_collections where id = ?", Long::class.javaObjectType, foodCollectionId)

    private fun rowExists(foodCollectionId: Long): Boolean = jdbcTemplate.queryForObject("select count(*) from food_collections where id = ?", Long::class.java, foodCollectionId) == 1L
}
