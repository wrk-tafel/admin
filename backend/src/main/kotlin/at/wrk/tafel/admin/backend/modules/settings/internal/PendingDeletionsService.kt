package at.wrk.tafel.admin.backend.modules.settings.internal

import at.wrk.tafel.admin.backend.common.api.PaginationDefaults
import at.wrk.tafel.admin.backend.common.auth.model.UserPermissions
import at.wrk.tafel.admin.backend.common.retention.RetentionPeriodFormatter
import at.wrk.tafel.admin.backend.common.retention.RetentionWindow
import at.wrk.tafel.admin.backend.config.properties.TafelAdminProperties
import at.wrk.tafel.admin.backend.database.model.auth.UserRepository
import at.wrk.tafel.admin.backend.database.model.base.EmployeeRepository
import at.wrk.tafel.admin.backend.database.model.household.HouseholdRepository
import at.wrk.tafel.admin.backend.modules.settings.model.PendingEmployeeDeletionItem
import at.wrk.tafel.admin.backend.modules.settings.model.PendingEmployeeDeletionListResponse
import at.wrk.tafel.admin.backend.modules.settings.model.PendingHouseholdDeletionItem
import at.wrk.tafel.admin.backend.modules.settings.model.PendingHouseholdDeletionListResponse
import at.wrk.tafel.admin.backend.modules.settings.model.PendingUserDeletionItem
import at.wrk.tafel.admin.backend.modules.settings.model.PendingUserDeletionListResponse
import org.springframework.data.domain.PageRequest
import org.springframework.stereotype.Service
import java.time.Clock
import java.time.LocalDateTime

/**
 * What `UserRetentionService`, `HouseholdRetentionService` and `EmployeeRetentionService` will delete
 * within their `retentionWarning` - the lists behind the daily push notification, and the screen that
 * notification opens. Measured exactly as the jobs and the reminder measure it (see
 * [RetentionWindow]); what is already due is included, since the job may not have run yet or may
 * have been stopped by its ceiling. Every list is paged, oldest activity first, so an administrator
 * can look through all of it and not only the first rows a job would handle in one run.
 *
 * Reads the repositories directly, like the reminder does, rather than depending on the modules that
 * own the jobs. Only administrators reach it (see `PendingDeletionsController`), and an administrator
 * holds every area's permission, so nothing is filtered per area here.
 */
@Service
class PendingDeletionsService(
    private val tafelAdminProperties: TafelAdminProperties,
    private val userRepository: UserRepository,
    private val householdRepository: HouseholdRepository,
    private val employeeRepository: EmployeeRepository,
    private val clock: Clock,
) {

    fun getPendingUserDeletions(page: Int?, pageSize: Int?): PendingUserDeletionListResponse {
        val config = tafelAdminProperties.userDeletion
        val cutoff = RetentionWindow.warnCutoff(config.enabled, config.retentionTime, config.retentionWarning, LocalDateTime.now(clock))
        val pageRequest = pageRequestOf(page, pageSize)
        val administrator = UserPermissions.ADMINISTRATOR.key

        val totalCount = cutoff?.let { userRepository.countUsersLastActiveBefore(it, administrator) } ?: 0
        val items = cutoff?.takeIf { totalCount > 0 }?.let {
            userRepository.findUsersLastActiveBefore(it, administrator, pageRequest).map { user ->
                PendingUserDeletionItem(
                    id = user.id!!,
                    username = user.username,
                    firstname = user.firstname,
                    lastname = user.lastname,
                    personnelNumber = user.personnelNumber,
                    lastLogin = user.lastLogin,
                    createdAt = user.createdAt!!,
                    deletionDate = (user.lastLogin ?: user.createdAt!!).toLocalDate().plus(config.retentionTime),
                )
            }
        }.orEmpty()

        return PendingUserDeletionListResponse(
            enabled = cutoff != null,
            retentionText = RetentionPeriodFormatter.format(config.retentionTime),
            warningText = RetentionPeriodFormatter.format(config.retentionWarning),
            totalCount = totalCount,
            currentPage = pageRequest.pageNumber + 1,
            totalPages = totalPagesOf(totalCount, pageRequest.pageSize),
            pageSize = pageRequest.pageSize,
            items = items,
        )
    }

    fun getPendingHouseholdDeletions(page: Int?, pageSize: Int?): PendingHouseholdDeletionListResponse {
        val config = tafelAdminProperties.householdDeletion
        val cutoff = RetentionWindow.warnCutoff(config.enabled, config.retentionTime, config.retentionWarning, LocalDateTime.now(clock))
            ?.toLocalDate()
        val pageRequest = pageRequestOf(page, pageSize)

        val totalCount = cutoff?.let { householdRepository.countByValidUntilBefore(it) } ?: 0
        val items = cutoff?.takeIf { totalCount > 0 }?.let {
            householdRepository.findAllByValidUntilBeforeOrderByValidUntilAscIdAsc(it, pageRequest).map { household ->
                PendingHouseholdDeletionItem(
                    householdId = household.householdId,
                    name = household.mainPerson?.let { person -> "${person.lastname} ${person.firstname}" },
                    validUntil = household.validUntil,
                    deletionDate = household.validUntil.plus(config.retentionTime),
                )
            }
        }.orEmpty()

        return PendingHouseholdDeletionListResponse(
            enabled = cutoff != null,
            retentionText = RetentionPeriodFormatter.format(config.retentionTime),
            warningText = RetentionPeriodFormatter.format(config.retentionWarning),
            totalCount = totalCount,
            currentPage = pageRequest.pageNumber + 1,
            totalPages = totalPagesOf(totalCount, pageRequest.pageSize),
            pageSize = pageRequest.pageSize,
            items = items,
        )
    }

    fun getPendingEmployeeDeletions(page: Int?, pageSize: Int?): PendingEmployeeDeletionListResponse {
        val config = tafelAdminProperties.employeeDeletion
        val cutoff = RetentionWindow.warnCutoff(config.enabled, config.retentionTime, config.retentionWarning, LocalDateTime.now(clock))
        val pageRequest = pageRequestOf(page, pageSize)

        val totalCount = cutoff?.let { employeeRepository.countEmployeesLastUsedBefore(it) } ?: 0
        val items = cutoff?.takeIf { totalCount > 0 }?.let {
            employeeRepository.findEmployeesLastUsedBefore(it, pageRequest.pageSize, pageRequest.offset.toInt()).map { employee ->
                PendingEmployeeDeletionItem(
                    id = employee.id,
                    personnelNumber = employee.personnelNumber,
                    firstname = employee.firstname,
                    lastname = employee.lastname,
                    lastUsed = employee.lastUsed,
                    createdAt = employee.createdAt,
                    deletionDate = (employee.lastUsed ?: employee.createdAt).toLocalDate().plus(config.retentionTime),
                )
            }
        }.orEmpty()

        return PendingEmployeeDeletionListResponse(
            enabled = cutoff != null,
            retentionText = RetentionPeriodFormatter.format(config.retentionTime),
            warningText = RetentionPeriodFormatter.format(config.retentionWarning),
            totalCount = totalCount,
            currentPage = pageRequest.pageNumber + 1,
            totalPages = totalPagesOf(totalCount, pageRequest.pageSize),
            pageSize = pageRequest.pageSize,
            items = items,
        )
    }

    private fun pageRequestOf(page: Int?, pageSize: Int?): PageRequest = PageRequest.of(PaginationDefaults.resolvePageIndex(page), PaginationDefaults.resolvePageSize(pageSize))

    private fun totalPagesOf(totalCount: Long, pageSize: Int): Int = ((totalCount + pageSize - 1) / pageSize).toInt()
}
