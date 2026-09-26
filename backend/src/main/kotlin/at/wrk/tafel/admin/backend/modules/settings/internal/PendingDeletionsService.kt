package at.wrk.tafel.admin.backend.modules.settings.internal

import at.wrk.tafel.admin.backend.common.auth.model.TafelJwtAuthentication
import at.wrk.tafel.admin.backend.common.auth.model.UserPermissions
import at.wrk.tafel.admin.backend.common.retention.RetentionPeriodFormatter
import at.wrk.tafel.admin.backend.common.retention.RetentionWindow
import at.wrk.tafel.admin.backend.config.properties.TafelAdminProperties
import at.wrk.tafel.admin.backend.database.model.auth.UserRepository
import at.wrk.tafel.admin.backend.database.model.base.EmployeeRepository
import at.wrk.tafel.admin.backend.database.model.household.HouseholdRepository
import at.wrk.tafel.admin.backend.modules.settings.model.PendingDeletionsResponse
import at.wrk.tafel.admin.backend.modules.settings.model.PendingEmployeeDeletionItem
import at.wrk.tafel.admin.backend.modules.settings.model.PendingEmployeeDeletionListResponse
import at.wrk.tafel.admin.backend.modules.settings.model.PendingHouseholdDeletionItem
import at.wrk.tafel.admin.backend.modules.settings.model.PendingHouseholdDeletionListResponse
import at.wrk.tafel.admin.backend.modules.settings.model.PendingUserDeletionItem
import at.wrk.tafel.admin.backend.modules.settings.model.PendingUserDeletionListResponse
import org.springframework.data.domain.PageRequest
import org.springframework.security.core.context.SecurityContextHolder
import org.springframework.stereotype.Service
import java.time.Clock
import java.time.LocalDateTime

/**
 * What `UserRetentionService`, `HouseholdRetentionService` and `EmployeeRetentionService` will delete
 * within their `retentionWarning` - the list behind the daily push notification, and the screen that
 * notification opens. Measured exactly as the jobs and the reminder measure it (see
 * [RetentionWindow]); what is already due is included, since the job may not have run yet or may
 * have been stopped by its ceiling.
 *
 * Reads the repositories directly, like the reminder does, rather than depending on the modules that
 * own the jobs. Each section is only filled for a caller who holds the permission of its area, the
 * same additive rule the Datenauskunft screen applies, so this screen adds no way to reach a name the
 * viewer could not otherwise see.
 */
@Service
class PendingDeletionsService(
    private val tafelAdminProperties: TafelAdminProperties,
    private val userRepository: UserRepository,
    private val householdRepository: HouseholdRepository,
    private val employeeRepository: EmployeeRepository,
    private val clock: Clock,
) {

    companion object {
        /** Rows shown per section; the total next to them says how many there really are. */
        const val MAX_ITEMS_PER_SECTION = 200
    }

    fun getPendingDeletions(): PendingDeletionsResponse {
        val authorities = (SecurityContextHolder.getContext().authentication as TafelJwtAuthentication)
            .authorities.mapNotNull { it.authority }.toSet()
        val now = LocalDateTime.now(clock)

        return PendingDeletionsResponse(
            users = if (UserPermissions.USER_MANAGEMENT.key in authorities) usersSection(now) else null,
            households = if (UserPermissions.CUSTOMER.key in authorities) householdsSection(now) else null,
            employees = if (UserPermissions.SETTINGS.key in authorities) employeesSection(now) else null,
        )
    }

    private fun usersSection(now: LocalDateTime): PendingUserDeletionListResponse {
        val config = tafelAdminProperties.userDeletion
        val cutoff = RetentionWindow.warnCutoff(config.enabled, config.retentionTime, config.retentionWarning, now)
        val page = PageRequest.of(0, MAX_ITEMS_PER_SECTION)
        val administrator = UserPermissions.ADMINISTRATOR.key

        return PendingUserDeletionListResponse(
            enabled = cutoff != null,
            retentionText = RetentionPeriodFormatter.format(config.retentionTime),
            warningText = RetentionPeriodFormatter.format(config.retentionWarning),
            totalCount = cutoff?.let { userRepository.countUsersLastActiveBefore(it, administrator) } ?: 0,
            items = cutoff?.let {
                userRepository.findUsersLastActiveBefore(it, administrator, page).map { user ->
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
            }.orEmpty(),
        )
    }

    private fun householdsSection(now: LocalDateTime): PendingHouseholdDeletionListResponse {
        val config = tafelAdminProperties.householdDeletion
        val cutoff = RetentionWindow.warnCutoff(config.enabled, config.retentionTime, config.retentionWarning, now)?.toLocalDate()

        return PendingHouseholdDeletionListResponse(
            enabled = cutoff != null,
            retentionText = RetentionPeriodFormatter.format(config.retentionTime),
            warningText = RetentionPeriodFormatter.format(config.retentionWarning),
            totalCount = cutoff?.let { householdRepository.countByValidUntilBefore(it) } ?: 0,
            items = cutoff?.let {
                householdRepository.findAllByValidUntilBeforeOrderByValidUntilAscIdAsc(it, PageRequest.of(0, MAX_ITEMS_PER_SECTION))
                    .map { household ->
                        PendingHouseholdDeletionItem(
                            householdId = household.householdId,
                            name = household.mainPerson?.let { person -> "${person.lastname} ${person.firstname}" },
                            validUntil = household.validUntil,
                            deletionDate = household.validUntil.plus(config.retentionTime),
                        )
                    }
            }.orEmpty(),
        )
    }

    private fun employeesSection(now: LocalDateTime): PendingEmployeeDeletionListResponse {
        val config = tafelAdminProperties.employeeDeletion
        val cutoff = RetentionWindow.warnCutoff(config.enabled, config.retentionTime, config.retentionWarning, now)

        return PendingEmployeeDeletionListResponse(
            enabled = cutoff != null,
            retentionText = RetentionPeriodFormatter.format(config.retentionTime),
            warningText = RetentionPeriodFormatter.format(config.retentionWarning),
            totalCount = cutoff?.let { employeeRepository.countEmployeesLastUsedBefore(it) } ?: 0,
            items = cutoff?.let {
                employeeRepository.findEmployeesLastUsedBefore(it, MAX_ITEMS_PER_SECTION).map { employee ->
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
            }.orEmpty(),
        )
    }
}
