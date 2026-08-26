package at.wrk.tafel.admin.backend.modules.datasubjectrequest.internal

import at.wrk.tafel.admin.backend.common.auth.components.TafelUserDetailsManager
import at.wrk.tafel.admin.backend.common.auth.components.UserExportService
import at.wrk.tafel.admin.backend.common.auth.model.TafelJwtAuthentication
import at.wrk.tafel.admin.backend.common.export.ExportFileResult
import at.wrk.tafel.admin.backend.config.properties.TafelAdminProperties
import at.wrk.tafel.admin.backend.database.common.search.SearchTextSpecs
import at.wrk.tafel.admin.backend.database.model.auth.UserRepository
import at.wrk.tafel.admin.backend.database.model.base.EmployeeRepository
import at.wrk.tafel.admin.backend.database.model.household.HouseholdRepository
import at.wrk.tafel.admin.backend.modules.base.employee.EmployeeDataSubjectFacade
import at.wrk.tafel.admin.backend.modules.base.exception.BusinessRuleException
import at.wrk.tafel.admin.backend.modules.base.exception.NotFoundException
import at.wrk.tafel.admin.backend.modules.base.exception.TafelApiException
import at.wrk.tafel.admin.backend.modules.datasubjectrequest.DataSubjectDeleteOutcome
import at.wrk.tafel.admin.backend.modules.datasubjectrequest.DataSubjectDeleteResponse
import at.wrk.tafel.admin.backend.modules.datasubjectrequest.DataSubjectDeleteResultItem
import at.wrk.tafel.admin.backend.modules.datasubjectrequest.DataSubjectMatch
import at.wrk.tafel.admin.backend.modules.datasubjectrequest.DataSubjectMatchItem
import at.wrk.tafel.admin.backend.modules.datasubjectrequest.DataSubjectMatchListResponse
import at.wrk.tafel.admin.backend.modules.datasubjectrequest.DataSubjectMatchType
import at.wrk.tafel.admin.backend.modules.household.HouseholdDataSubjectFacade
import org.springframework.data.domain.PageRequest
import org.springframework.data.jpa.domain.Specification.where
import org.springframework.http.HttpStatus
import org.springframework.security.core.context.SecurityContextHolder
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional
import java.io.ByteArrayOutputStream
import java.util.zip.ZipEntry
import java.util.zip.ZipInputStream
import java.util.zip.ZipOutputStream
import at.wrk.tafel.admin.backend.database.model.auth.UserEntity.Specs.Companion.orderBySearchRelevance as orderUsersBySearchRelevance
import at.wrk.tafel.admin.backend.database.model.auth.UserEntity.Specs.Companion.searchTextMatches as userSearchTextMatches
import at.wrk.tafel.admin.backend.database.model.household.HouseholdEntity.Specs.Companion.orderBySearchRelevance as orderHouseholdsBySearchRelevance
import at.wrk.tafel.admin.backend.database.model.household.HouseholdEntity.Specs.Companion.searchTextMatches as householdSearchTextMatches

@Service
class DataSubjectRequestService(
    private val householdRepository: HouseholdRepository,
    private val userRepository: UserRepository,
    private val employeeRepository: EmployeeRepository,
    private val householdFacade: HouseholdDataSubjectFacade,
    private val employeeFacade: EmployeeDataSubjectFacade,
    private val userExportService: UserExportService,
    private val userDetailsManager: TafelUserDetailsManager,
    private val tafelAdminProperties: TafelAdminProperties,
) {

    companion object {
        // A search box picking one specific person, not a report - a handful of best matches per
        // area is what someone scanning the results by eye can actually use.
        private const val MAX_RESULTS_PER_TYPE = 20

        // Employees are fetched in a larger batch than MAX_RESULTS_PER_TYPE because every one
        // already linked to a user account is filtered out afterwards (that person is already
        // represented by their USER_ACCOUNT match) - see searchEmployeesWithoutAccount.
        private const val EMPLOYEE_CANDIDATE_BATCH_SIZE = 50

        private val PERMISSION_BY_TYPE = mapOf(
            DataSubjectMatchType.CUSTOMER to "CUSTOMER",
            DataSubjectMatchType.USER_ACCOUNT to "USER_MANAGEMENT",
            DataSubjectMatchType.EMPLOYEE_WITHOUT_ACCOUNT to "SETTINGS",
        )
    }

    fun search(searchInput: String): DataSubjectMatchListResponse {
        val searchTerm = SearchTextSpecs.normalize(searchInput)
            ?: return DataSubjectMatchListResponse(items = emptyList())

        val items = searchHouseholds(searchTerm) + searchUsers(searchTerm) + searchEmployeesWithoutAccount(searchTerm)
        return DataSubjectMatchListResponse(items = items)
    }

    /**
     * One combined ZIP regardless of how many/what type of matches are selected - a predictable
     * content type beats a conditional PDF-vs-ZIP response, and it is what lets a customer match and
     * a staff match (the same person, holding both) come back as the one archive the "combine into
     * one export" decision behind issue #3396 asked for. Each match's own export keeps its
     * area-prefixed folder rather than being flattened into one namespace, since a household export
     * is itself already a ZIP full of documents that would otherwise collide with another match's
     * files.
     *
     * All-or-nothing: unlike [delete], this is one downloaded file, so a match that can't be
     * exported (e.g. an employee whose account already covers them) fails the whole request rather
     * than silently producing an incomplete archive.
     */
    @Transactional
    fun export(matches: List<DataSubjectMatch>): ExportFileResult {
        val distinctMatches = requireNonEmptyDistinct(matches)

        val buffer = ByteArrayOutputStream()
        ZipOutputStream(buffer).use { zip ->
            distinctMatches.forEach { match ->
                requireAreaPermission(match.type)
                val result = exportMatch(match)
                val folder = "${folderName(match.type)}-${match.id}"
                addToZip(zip, folder, result)
            }
        }

        return ExportFileResult(filename = "datenauskunft.zip", bytes = buffer.toByteArray())
    }

    /**
     * Runs per match independently - see [DataSubjectDeleteResponse]'s KDoc for why this isn't
     * all-or-nothing the way [export] is.
     */
    @Transactional
    fun delete(matches: List<DataSubjectMatch>): DataSubjectDeleteResponse {
        val distinctMatches = requireNonEmptyDistinct(matches)

        val results = distinctMatches.map { match ->
            requireAreaPermission(match.type)
            val deleted = deleteMatch(match)
            DataSubjectDeleteResultItem(
                match = match,
                outcome = if (deleted) DataSubjectDeleteOutcome.DELETED else DataSubjectDeleteOutcome.NOT_FOUND,
            )
        }

        return DataSubjectDeleteResponse(results = results)
    }

    private fun searchHouseholds(searchTerm: String): List<DataSubjectMatchItem> {
        val spec = orderHouseholdsBySearchRelevance(
            searchTerm,
            where(householdSearchTextMatches(searchTerm, tafelAdminProperties.search.similarityThreshold)!!),
        )
        return householdRepository.findAll(spec, PageRequest.of(0, MAX_RESULTS_PER_TYPE)).content.map {
            DataSubjectMatchItem(
                type = DataSubjectMatchType.CUSTOMER,
                id = it.householdId,
                businessKey = it.householdId.toString(),
                name = it.mainPerson?.let { person -> listOfNotNull(person.lastname, person.firstname).joinToString(" ") } ?: "-",
            )
        }
    }

    private fun searchUsers(searchTerm: String): List<DataSubjectMatchItem> {
        val spec = orderUsersBySearchRelevance(
            searchTerm,
            where(userSearchTextMatches(searchTerm, tafelAdminProperties.search.similarityThreshold)!!),
        )
        return userRepository.findAll(spec, PageRequest.of(0, MAX_RESULTS_PER_TYPE)).content.map {
            DataSubjectMatchItem(
                type = DataSubjectMatchType.USER_ACCOUNT,
                id = it.id!!,
                businessKey = it.username,
                name = "${it.employee.lastname} ${it.employee.firstname}",
            )
        }
    }

    /**
     * Excludes an employee already referenced by a `users` row - that person is exported/deleted
     * through their USER_ACCOUNT match instead, mirroring `EmployeeExportService`'s own refusal.
     */
    private fun searchEmployeesWithoutAccount(searchTerm: String): List<DataSubjectMatchItem> {
        val candidates = employeeRepository.findBySearchInput(searchTerm, PageRequest.of(0, EMPLOYEE_CANDIDATE_BATCH_SIZE)).content
        if (candidates.isEmpty()) {
            return emptyList()
        }

        val linkedEmployeeIds = userRepository.findAccountsByEmployeeIds(candidates.mapNotNull { it.id }).map { it.employeeId }.toSet()
        return candidates
            .filterNot { linkedEmployeeIds.contains(it.id) }
            .take(MAX_RESULTS_PER_TYPE)
            .map {
                DataSubjectMatchItem(
                    type = DataSubjectMatchType.EMPLOYEE_WITHOUT_ACCOUNT,
                    id = it.id!!,
                    businessKey = it.personnelNumber,
                    name = "${it.lastname} ${it.firstname}",
                )
            }
    }

    private fun exportMatch(match: DataSubjectMatch): ExportFileResult = when (match.type) {
        DataSubjectMatchType.CUSTOMER -> householdFacade.export(match.id)
            ?: throw NotFoundException("Kunde Nr. ${match.id} nicht vorhanden!")

        DataSubjectMatchType.USER_ACCOUNT -> userExportService.exportUserById(match.id)
            ?.let { ExportFileResult(filename = it.filename, bytes = it.bytes) }
            ?: throw NotFoundException("Benutzer (ID: ${match.id}) nicht gefunden!")

        DataSubjectMatchType.EMPLOYEE_WITHOUT_ACCOUNT -> employeeFacade.export(match.id)
            ?: throw NotFoundException("Mitarbeiter (ID: ${match.id}) nicht gefunden!")
    }

    private fun deleteMatch(match: DataSubjectMatch): Boolean = when (match.type) {
        DataSubjectMatchType.CUSTOMER -> householdFacade.delete(match.id)

        DataSubjectMatchType.USER_ACCOUNT -> userDetailsManager.deleteUserById(match.id)

        DataSubjectMatchType.EMPLOYEE_WITHOUT_ACCOUNT -> if (employeeRepository.existsById(match.id)) {
            employeeFacade.delete(match.id)
            true
        } else {
            false
        }
    }

    private fun folderName(type: DataSubjectMatchType): String = when (type) {
        DataSubjectMatchType.CUSTOMER -> "kunde"
        DataSubjectMatchType.USER_ACCOUNT -> "benutzerkonto"
        DataSubjectMatchType.EMPLOYEE_WITHOUT_ACCOUNT -> "mitarbeiter"
    }

    /**
     * A household's own export is already a ZIP (its master-data PDF plus every uploaded document) -
     * unpacked here rather than nested as-is, so the combined archive reads as one flat set of
     * folders instead of a ZIP containing another ZIP. A user's/employee's export is a single PDF,
     * added directly under its own folder. No name collisions to guard against: [folder] already
     * carries the match's type and id, so two matches never share one, and a household's own entries
     * are already unique among themselves (`HouseholdExportService` dedupes those itself).
     */
    private fun addToZip(zip: ZipOutputStream, folder: String, result: ExportFileResult) {
        if (result.filename.endsWith(".zip")) {
            ZipInputStream(result.bytes.inputStream()).use { source ->
                generateSequence { source.nextEntry }.forEach { entry ->
                    zip.putNextEntry(ZipEntry("$folder/${entry.name}"))
                    source.copyTo(zip)
                    zip.closeEntry()
                }
            }
        } else {
            zip.putNextEntry(ZipEntry("$folder/${result.filename}"))
            zip.write(result.bytes)
            zip.closeEntry()
        }
    }

    private fun requireNonEmptyDistinct(matches: List<DataSubjectMatch>): List<DataSubjectMatch> {
        if (matches.isEmpty()) {
            throw BusinessRuleException("Keine Auswahl getroffen!")
        }
        return matches.distinct()
    }

    /**
     * `DATA_SUBJECT_REQUESTS` (checked at the controller) only grants reaching the search and
     * picking a match - the actual export/delete still needs that area's own permission, same as
     * triggering it from the household/user/Mitarbeiter screen directly (additive permission model,
     * issue #3396).
     */
    private fun requireAreaPermission(type: DataSubjectMatchType) {
        val requiredAuthority = PERMISSION_BY_TYPE.getValue(type)
        val authentication = SecurityContextHolder.getContext().authentication as TafelJwtAuthentication
        if (authentication.authorities.none { it.authority == requiredAuthority }) {
            throw TafelApiException(
                HttpStatus.FORBIDDEN,
                "Für \"${type.title}\" ist die Berechtigung \"$requiredAuthority\" erforderlich!",
            )
        }
    }
}
