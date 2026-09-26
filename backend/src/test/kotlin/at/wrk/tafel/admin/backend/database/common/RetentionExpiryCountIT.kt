package at.wrk.tafel.admin.backend.database.common

import at.wrk.tafel.admin.backend.TafelBaseIntegrationTest
import at.wrk.tafel.admin.backend.database.model.base.EmployeeEntity
import at.wrk.tafel.admin.backend.database.model.base.EmployeeRepository
import at.wrk.tafel.admin.backend.database.model.household.HouseholdEntity
import at.wrk.tafel.admin.backend.database.model.household.HouseholdRepository
import org.assertj.core.api.Assertions.assertThat
import org.junit.jupiter.api.Test
import org.springframework.beans.factory.annotation.Autowired
import org.springframework.data.domain.PageRequest
import org.springframework.jdbc.core.JdbcTemplate
import java.time.LocalDate
import java.time.LocalDateTime

/**
 * The counts behind the administrators' advance warning (`RetentionExpiryReminderService`) against a
 * real database. They have to agree with what the retention jobs will delete, so each is compared
 * with its job's own candidate query. Every fixture is dated to the beginning of 2001 and counted
 * against a mid-2001 cutoff. That is after the cutoff (mid-2000) `ScheduledCleanupSkipLockedIT` asserts
 * exact candidate lists against, so these rows never turn up there, and counts are compared as a
 * difference so rows other classes left behind do not matter: these tables are shared by the whole
 * run. The user count has its own test, `UserRepositoryExpiryCountIT`.
 */
class RetentionExpiryCountIT : TafelBaseIntegrationTest() {

    private companion object {
        val LONG_AGO: LocalDateTime = LocalDateTime.of(2001, 1, 1, 0, 0)
        val CUTOFF: LocalDateTime = LocalDateTime.of(2001, 6, 1, 0, 0)
        val CUTOFF_DATE: LocalDate = CUTOFF.toLocalDate()
        const val HOUSEHOLD_ID_BASE = 91_000_000_000_000L
        var fixtureCounter = 0L
    }

    @Autowired
    private lateinit var householdRepository: HouseholdRepository

    @Autowired
    private lateinit var employeeRepository: EmployeeRepository

    @Autowired
    private lateinit var jdbcTemplate: JdbcTemplate

    @Test
    fun `counts households whose validity lies before the cutoff`() {
        val before = householdRepository.countByValidUntilBefore(CUTOFF_DATE)

        givenHousehold(validUntil = LocalDate.of(2001, 1, 1))
        givenHousehold(validUntil = LocalDate.of(2001, 3, 1))
        givenHousehold(validUntil = LocalDate.of(2999, 12, 31))

        assertThat(householdRepository.countByValidUntilBefore(CUTOFF_DATE) - before).isEqualTo(2)
    }

    @Test
    fun `the household count agrees with the candidates the retention job would claim`() {
        givenHousehold(validUntil = LocalDate.of(2001, 1, 1))

        assertThat(householdRepository.countByValidUntilBefore(CUTOFF_DATE))
            .isEqualTo(householdRepository.findExpiredHouseholdIdsSkipLocked(CUTOFF_DATE).size.toLong())
    }

    @Test
    fun `counts employees by their last use, falling back to their creation date`() {
        val before = employeeRepository.countEmployeesLastUsedBefore(CUTOFF)

        givenEmployee(createdAt = LONG_AGO)
        givenEmployee(createdAt = LocalDateTime.of(2999, 1, 1, 0, 0))

        assertThat(employeeRepository.countEmployeesLastUsedBefore(CUTOFF) - before).isEqualTo(1)
    }

    @Test
    fun `the employee count agrees with the candidates the retention job would claim`() {
        givenEmployee(createdAt = LONG_AGO)

        assertThat(employeeRepository.countEmployeesLastUsedBefore(CUTOFF))
            .isEqualTo(employeeRepository.findExpiredEmployeeIdsSkipLocked(CUTOFF).size.toLong())
    }

    @Test
    fun `lists the households behind the count, oldest validity first`() {
        val older = givenHousehold(validUntil = LocalDate.of(2001, 1, 1))
        val newer = givenHousehold(validUntil = LocalDate.of(2001, 3, 1))
        val notDue = givenHousehold(validUntil = LocalDate.of(2999, 12, 31))

        val listed = householdRepository.findAllByValidUntilBeforeOrderByValidUntilAscIdAsc(CUTOFF_DATE, PageRequest.of(0, 1000)).map { it.householdId }

        assertThat(listed).contains(older, newer)
        assertThat(listed.indexOf(older)).isLessThan(listed.indexOf(newer))
        assertThat(listed).doesNotContain(notDue)
    }

    @Test
    fun `lists the employees behind the count with the moments their last use is measured from`() {
        val neverUsed = givenEmployee(createdAt = LONG_AGO)

        val listed = employeeRepository.findEmployeesLastUsedBefore(CUTOFF, 1000, 0).single { it.id == neverUsed }

        assertThat(listed.lastUsed).isNull()
        assertThat(listed.createdAt).isEqualTo(LONG_AGO)
        assertThat(listed.personnelNumber).startsWith("expiry-count-employee-")
    }

    @Test
    fun `pages the employee list by limit and offset`() {
        val first = givenEmployee(createdAt = LONG_AGO)
        val second = givenEmployee(createdAt = LONG_AGO.plusDays(1))

        val all = employeeRepository.findEmployeesLastUsedBefore(CUTOFF, 1000, 0).map { it.id }
        val pageSize = 1
        val firstPage = employeeRepository.findEmployeesLastUsedBefore(CUTOFF, pageSize, all.indexOf(first)).map { it.id }
        val secondPage = employeeRepository.findEmployeesLastUsedBefore(CUTOFF, pageSize, all.indexOf(second)).map { it.id }

        assertThat(firstPage).containsExactly(first)
        assertThat(secondPage).containsExactly(second)
        assertThat(all.indexOf(first)).isLessThan(all.indexOf(second))
    }

    private fun givenHousehold(validUntil: LocalDate): Long {
        val householdId = HOUSEHOLD_ID_BASE + fixtureCounter++
        householdRepository.save(HouseholdEntity(householdId = householdId, validUntil = validUntil, locked = false))
        return householdId
    }

    private fun givenEmployee(createdAt: LocalDateTime): Long {
        val number = fixtureCounter++
        val employee = employeeRepository.save(
            EmployeeEntity(personnelNumber = "expiry-count-employee-$number", firstname = "first", lastname = "last"),
        )
        jdbcTemplate.update("UPDATE employees SET created_at = ? WHERE id = ?", createdAt, employee.id)
        return employee.id!!
    }
}
