package at.wrk.tafel.admin.backend.common.auth

import at.wrk.tafel.admin.backend.TafelBaseIntegrationTest
import at.wrk.tafel.admin.backend.common.auth.components.TafelUserDetailsManager
import at.wrk.tafel.admin.backend.common.auth.model.TafelUser
import at.wrk.tafel.admin.backend.common.auth.model.UserPermissions
import at.wrk.tafel.admin.backend.common.test.TestdataGenerator.createCountry
import at.wrk.tafel.admin.backend.common.test.TestdataGenerator.createDistribution
import at.wrk.tafel.admin.backend.common.test.TestdataGenerator.createHousehold
import at.wrk.tafel.admin.backend.common.test.TestdataGenerator.createUser
import at.wrk.tafel.admin.backend.common.test.TestdataGenerator.generateRandomLong
import at.wrk.tafel.admin.backend.database.model.auth.UserRepository
import at.wrk.tafel.admin.backend.database.model.base.EmployeeEntity
import at.wrk.tafel.admin.backend.database.model.base.EmployeeRepository
import at.wrk.tafel.admin.backend.database.model.household.HouseholdNoteEntity
import at.wrk.tafel.admin.backend.database.model.logistics.FoodCollectionEntity
import at.wrk.tafel.admin.backend.database.model.logistics.RouteEntity
import at.wrk.tafel.admin.backend.database.model.logistics.RouteStopCompletionEntity
import at.wrk.tafel.admin.backend.database.model.logistics.RouteStopEntity
import at.wrk.tafel.admin.backend.modules.base.employee.internal.EmployeeService
import org.assertj.core.api.Assertions.assertThat
import org.junit.jupiter.api.Test
import org.springframework.beans.factory.annotation.Autowired
import org.springframework.boot.jpa.test.autoconfigure.TestEntityManager
import org.springframework.jdbc.core.JdbcTemplate
import org.springframework.security.core.authority.SimpleGrantedAuthority
import org.springframework.transaction.annotation.Transactional
import java.time.LocalDate
import java.time.LocalTime

/**
 * Users and employees are two records with nothing between them (issue #3740): a user owns its
 * personnel number and name, an employee is only ever a food collection's driver or co-driver.
 * Everything here runs against the real schema, since the foreign keys' `on delete set null` and the
 * search-text trigger are the parts a mocked repository cannot see.
 */
@Transactional
class UserEmployeeSeparationIT : TafelBaseIntegrationTest() {

    @Autowired
    private lateinit var testEntityManager: TestEntityManager

    @Autowired
    private lateinit var userDetailsManager: TafelUserDetailsManager

    @Autowired
    private lateinit var userRepository: UserRepository

    @Autowired
    private lateinit var employeeRepository: EmployeeRepository

    @Autowired
    private lateinit var employeeService: EmployeeService

    @Autowired
    private lateinit var jdbcTemplate: JdbcTemplate

    @Test
    fun `creating and updating a user stores the name and personnel number on the user and creates no employee`() {
        val tag = generateRandomLong()
        val personnelNumber = "sep-$tag"
        val employeesBefore = countEmployees()

        userDetailsManager.createUser(
            tafelUser(username = "sep-user-$tag", personnelNumber = personnelNumber, firstname = "Erika", lastname = "Musterfrau"),
        )
        testEntityManager.flush()
        testEntityManager.clear()

        val created = userRepository.findByPersonnelNumber(personnelNumber)!!
        assertThat(created.username).isEqualTo("sep-user-$tag")
        assertThat(created.firstname).isEqualTo("Erika")
        assertThat(created.lastname).isEqualTo("Musterfrau")
        assertThat(countEmployeesWithPersonnelNumber(personnelNumber)).isZero()
        assertThat(countEmployees()).isEqualTo(employeesBefore)

        val renamedNumber = "sep-renamed-$tag"
        userDetailsManager.updateUser(
            tafelUser(
                id = created.id,
                username = "sep-user-$tag",
                personnelNumber = renamedNumber,
                firstname = "Erna",
                lastname = "Beispiel",
            ),
        )
        testEntityManager.flush()
        testEntityManager.clear()

        val updated = userRepository.findById(created.id!!).get()
        assertThat(updated.personnelNumber).isEqualTo(renamedNumber)
        assertThat(updated.firstname).isEqualTo("Erna")
        assertThat(updated.lastname).isEqualTo("Beispiel")
        assertThat(countEmployeesWithPersonnelNumber(personnelNumber)).isZero()
        assertThat(countEmployeesWithPersonnelNumber(renamedNumber)).isZero()
        assertThat(countEmployees()).isEqualTo(employeesBefore)
    }

    @Test
    fun `renaming a user keeps the search text in step, and an employee never touches it`() {
        val tag = generateRandomLong()
        val user = createUser().apply { personnelNumber = "sep-search-$tag" }
        testEntityManager.persist(user)
        val employee = EmployeeEntity(personnelNumber = "sep-search-$tag", firstname = "Fahrer", lastname = "Zwei")
        testEntityManager.persist(employee)
        testEntityManager.flush()
        val searchTextBefore = searchTextOfUser(user.id!!)
        assertThat(searchTextBefore).contains("sep-search-$tag")

        // the employee's rename does not reach the user ...
        employee.lastname = "Umbenannt$tag"
        testEntityManager.flush()
        assertThat(searchTextOfUser(user.id!!)).isEqualTo(searchTextBefore)

        // ... while the user's own does
        userDetailsManager.updateOwnAccount(user.username, "Erika", "Findme$tag", null)
        testEntityManager.flush()
        assertThat(searchTextOfUser(user.id!!)).contains("erika").contains("findme$tag")
    }

    @Test
    fun `deleting a user leaves employees untouched and clears every reference to it`() {
        val tag = generateRandomLong()
        val employee = EmployeeEntity(personnelNumber = "sep-emp-$tag", firstname = "Fahrer", lastname = "Eins")
        testEntityManager.persist(employee)

        val user = createUser().apply { personnelNumber = "sep-emp-$tag" }
        testEntityManager.persist(user)

        val country = createCountry()
        testEntityManager.persist(country)
        val household = createHousehold(user, country)
        testEntityManager.persist(household)
        val note = HouseholdNoteEntity(household = household, note = "note").apply { author = user }
        testEntityManager.persist(note)

        val route = RouteEntity(number = tag.toDouble(), name = "route-$tag")
        testEntityManager.persist(route)
        val stop = RouteStopEntity(route = route, time = LocalTime.of(9, 0))
        testEntityManager.persist(stop)
        val completion = RouteStopCompletionEntity(routeStop = stop, completionDate = LocalDate.now()).apply { completedBy = user }
        testEntityManager.persist(completion)
        testEntityManager.flush()

        val employeeId = employee.id!!
        val householdId = household.id!!
        val noteId = note.id!!
        val completionId = completion.id!!
        assertThat(referenceOf("households", "issuer_user_id", householdId)).isEqualTo(user.id)
        assertThat(referenceOf("household_notes", "author_user_id", noteId)).isEqualTo(user.id)
        assertThat(referenceOf("routes_stops_completions", "completed_by_user_id", completionId)).isEqualTo(user.id)

        // Clears the persistence context first: household/note/completion are still cached with their
        // (now stale) in-memory reference to the user about to be deleted, and flushing that together
        // with the delete would trip Hibernate's own check before the database applies `on delete set null`.
        testEntityManager.clear()

        userDetailsManager.deleteUser(user.username)
        testEntityManager.flush()
        testEntityManager.clear()

        assertThat(employeeRepository.findById(employeeId)).isPresent
        assertThat(countEmployeesWithPersonnelNumber("sep-emp-$tag")).isEqualTo(1)

        assertThat(rowExists("households", householdId)).isTrue()
        assertThat(rowExists("household_notes", noteId)).isTrue()
        assertThat(rowExists("routes_stops_completions", completionId)).isTrue()
        assertThat(referenceOf("households", "issuer_user_id", householdId)).isNull()
        assertThat(referenceOf("household_notes", "author_user_id", noteId)).isNull()
        assertThat(referenceOf("routes_stops_completions", "completed_by_user_id", completionId)).isNull()
    }

    @Test
    fun `deleting an employee referenced as food collection driver succeeds and clears the driver`() {
        val tag = generateRandomLong()
        val driver = EmployeeEntity(personnelNumber = "sep-drv-$tag", firstname = "Fahrer", lastname = "Eins")
        testEntityManager.persist(driver)
        val coDriver = EmployeeEntity(personnelNumber = "sep-cdrv-$tag", firstname = "Fahrer", lastname = "Zwei")
        testEntityManager.persist(coDriver)

        val user = createUser()
        testEntityManager.persist(user)
        val distribution = createDistribution(user)
        testEntityManager.persist(distribution)
        val route = RouteEntity(number = tag.toDouble(), name = "route-$tag")
        testEntityManager.persist(route)
        val foodCollection = FoodCollectionEntity(distribution = distribution, route = route).apply {
            this.driver = driver
            this.coDriver = coDriver
        }
        testEntityManager.persist(foodCollection)
        testEntityManager.flush()

        val driverId = driver.id!!
        val coDriverId = coDriver.id!!
        val foodCollectionId = foodCollection.id!!
        testEntityManager.clear()

        employeeService.deleteEmployee(driverId)
        employeeService.deleteEmployee(coDriverId)
        testEntityManager.flush()
        testEntityManager.clear()

        assertThat(employeeRepository.findById(driverId)).isEmpty
        assertThat(employeeRepository.findById(coDriverId)).isEmpty
        assertThat(rowExists("food_collections", foodCollectionId)).isTrue()
        assertThat(referenceOf("food_collections", "driver_employee_id", foodCollectionId)).isNull()
        assertThat(referenceOf("food_collections", "co_driver_employee_id", foodCollectionId)).isNull()
    }

    private fun tafelUser(
        username: String,
        personnelNumber: String,
        firstname: String,
        lastname: String,
        id: Long? = null,
    ) = TafelUser(
        username = username,
        password = "Passwort-1234!",
        enabled = true,
        id = id,
        personnelNumber = personnelNumber,
        firstname = firstname,
        lastname = lastname,
        authorities = listOf(SimpleGrantedAuthority(UserPermissions.CHECKIN.key)),
        passwordChangeRequired = false,
    )

    private fun countEmployees(): Long = jdbcTemplate.queryForObject("select count(*) from employees", Long::class.java)!!

    private fun countEmployeesWithPersonnelNumber(personnelNumber: String): Long = jdbcTemplate.queryForObject("select count(*) from employees where personnel_number = ?", Long::class.java, personnelNumber)!!

    private fun searchTextOfUser(userId: Long): String = jdbcTemplate.queryForObject("select search_text from users where id = ?", String::class.java, userId)!!

    private fun rowExists(table: String, id: Long): Boolean = jdbcTemplate.queryForObject("select count(*) from $table where id = ?", Long::class.java, id) == 1L

    private fun referenceOf(table: String, column: String, id: Long): Long? = jdbcTemplate.queryForObject("select $column from $table where id = ?", Long::class.javaObjectType, id)
}
