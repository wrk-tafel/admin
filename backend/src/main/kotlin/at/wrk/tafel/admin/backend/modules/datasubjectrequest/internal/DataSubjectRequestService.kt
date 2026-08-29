package at.wrk.tafel.admin.backend.modules.datasubjectrequest.internal

import at.wrk.tafel.admin.backend.common.auth.components.TafelUserDetailsManager
import at.wrk.tafel.admin.backend.common.auth.components.UserExportService
import at.wrk.tafel.admin.backend.common.auth.model.TafelJwtAuthentication
import at.wrk.tafel.admin.backend.common.export.ExportFileResult
import at.wrk.tafel.admin.backend.config.properties.TafelAdminProperties
import at.wrk.tafel.admin.backend.database.common.search.SearchTextSpecs
import at.wrk.tafel.admin.backend.database.model.auth.UserRepository
import at.wrk.tafel.admin.backend.database.model.base.EmployeeEntity
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
import org.slf4j.LoggerFactory
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
        private val logger = LoggerFactory.getLogger(DataSubjectRequestService::class.java)

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

    /**
     * Additive with the export/delete permission re-check below: a caller only sees matches from an
     * area they hold the permission for, so `DATA_SUBJECT_REQUESTS` alone never surfaces a name,
     * household number or username the caller couldn't otherwise reach (issue #3428).
     */
    fun search(searchInput: String): DataSubjectMatchListResponse {
        val searchTerm = SearchTextSpecs.normalize(searchInput)
            ?: return DataSubjectMatchListResponse(items = emptyList())

        val results = listOfNotNull(
            if (hasAreaPermission(DataSubjectMatchType.CUSTOMER)) searchHouseholds(searchTerm) else null,
            if (hasAreaPermission(DataSubjectMatchType.USER_ACCOUNT)) searchUsers(searchTerm) else null,
            if (hasAreaPermission(DataSubjectMatchType.EMPLOYEE_WITHOUT_ACCOUNT)) searchEmployeesWithoutAccount(searchTerm) else null,
        )

        return DataSubjectMatchListResponse(
            items = results.flatMap { it.items },
            truncated = results.any { it.truncated },
        )
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
     *
     * Every match's permission is checked upfront, before any deletion happens: this whole method
     * is one transaction, so a permission check that instead ran mid-loop (as [export]'s still does,
     * fine there since nothing has side effects on disk) could reject a later match only after an
     * earlier one had already deleted files from disk - see [HouseholdService.deleteHouseholdByHouseholdId]
     * for why that ordering matters.
     */
    @Transactional
    fun delete(matches: List<DataSubjectMatch>): DataSubjectDeleteResponse {
        val distinctMatches = requireNonEmptyDistinct(matches)
        distinctMatches.forEach { requireAreaPermission(it.type) }

        val results = distinctMatches.map { match ->
            val deleted = deleteMatch(match)
            DataSubjectDeleteResultItem(
                match = match,
                outcome = if (deleted) DataSubjectDeleteOutcome.DELETED else DataSubjectDeleteOutcome.NOT_FOUND,
            )
        }

        return DataSubjectDeleteResponse(results = results)
    }

    /** [truncated] is true when the area held more matches than [MAX_RESULTS_PER_TYPE] could show. */
    private data class SearchResult(val items: List<DataSubjectMatchItem>, val truncated: Boolean)

    private fun searchHouseholds(searchTerm: String): SearchResult {
        val spec = orderHouseholdsBySearchRelevance(
            searchTerm,
            where(householdSearchTextMatches(searchTerm, tafelAdminProperties.search.similarityThreshold)!!),
        )
        val page = householdRepository.findAll(spec, PageRequest.of(0, MAX_RESULTS_PER_TYPE))
        return SearchResult(
            items = page.content.map {
                DataSubjectMatchItem(
                    type = DataSubjectMatchType.CUSTOMER,
                    id = it.householdId,
                    businessKey = it.householdId.toString(),
                    name = it.mainPerson?.let { person -> listOfNotNull(person.lastname, person.firstname).joinToString(" ") } ?: "-",
                )
            },
            truncated = page.hasNext(),
        )
    }

    private fun searchUsers(searchTerm: String): SearchResult {
        val spec = orderUsersBySearchRelevance(
            searchTerm,
            where(userSearchTextMatches(searchTerm, tafelAdminProperties.search.similarityThreshold)!!),
        )
        val page = userRepository.findAll(spec, PageRequest.of(0, MAX_RESULTS_PER_TYPE))
        return SearchResult(
            items = page.content.map {
                DataSubjectMatchItem(
                    type = DataSubjectMatchType.USER_ACCOUNT,
                    id = it.id!!,
                    businessKey = it.username,
                    name = "${it.employee.lastname} ${it.employee.firstname}",
                )
            },
            truncated = page.hasNext(),
        )
    }

    /**
     * Excludes an employee already referenced by a `users` row - that person is exported/deleted
     * through their USER_ACCOUNT match instead, mirroring `EmployeeExportService`'s own refusal.
     * [SearchResult.truncated] covers both ways this can be cut short: the candidate batch itself
     * held more rows than [EMPLOYEE_CANDIDATE_BATCH_SIZE], or filtering out linked employees still
     * left more than [MAX_RESULTS_PER_TYPE] candidates.
     */
    private fun searchEmployeesWithoutAccount(searchTerm: String): SearchResult {
        val candidatesPage = employeeRepository.findBySearchInput(searchTerm, PageRequest.of(0, EMPLOYEE_CANDIDATE_BATCH_SIZE))
        val candidates: List<EmployeeEntity> = candidatesPage.content
        if (candidates.isEmpty()) {
            return SearchResult(items = emptyList(), truncated = false)
        }

        val linkedEmployeeIds = userRepository.findAccountsByEmployeeIds(candidates.mapNotNull { it.id }).map { it.employeeId }.toSet()
        val withoutAccount = candidates.filterNot { linkedEmployeeIds.contains(it.id) }
        return SearchResult(
            items = withoutAccount.take(MAX_RESULTS_PER_TYPE).map {
                DataSubjectMatchItem(
                    type = DataSubjectMatchType.EMPLOYEE_WITHOUT_ACCOUNT,
                    id = it.id!!,
                    businessKey = it.personnelNumber,
                    name = "${it.lastname} ${it.firstname}",
                )
            },
            truncated = candidatesPage.hasNext() || withoutAccount.size > MAX_RESULTS_PER_TYPE,
        )
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

        DataSubjectMatchType.USER_ACCOUNT -> deleteUserAndLinkedEmployee(match.id)

        DataSubjectMatchType.EMPLOYEE_WITHOUT_ACCOUNT -> if (employeeRepository.existsById(match.id)) {
            employeeFacade.delete(match.id)
            true
        } else {
            false
        }
    }

    /**
     * `UserEntity.employee` is deliberately not cascade-`REMOVE`d (see its KDoc), so deleting a user
     * account alone leaves personnel number and full name in `employees` until
     * `EmployeeRetentionService` finds it unreferenced, up to `tafeladmin.employeeDeletion.retentionTime`
     * (7 years by default) later - too long for a GDPR Art. 17 erasure request (issue #3423). The
     * employee record is deleted here too, but only once nothing other than the just-deleted `users`
     * row still points at it - a household issuer, a household note's author, a food collection's
     * driver/co-driver, or a route stop completion's recorder are still-live records, not abandoned
     * personal data, so cascading into those is left to `EmployeeRetentionService`'s own age-gated
     * sweep rather than forced here.
     *
     * Also checked: whether another, still-existing user account is linked to the same employee.
     * `users.employee_id` is meant to be one-to-one (see `EmployeeService.deleteEmployee`'s KDoc), but
     * a pre-existing duplicate link predating that invariant would otherwise make `employeeFacade.delete`
     * throw a `ConflictException` here, which - this whole method being one transaction (see [delete]'s
     * KDoc) - would roll back every other match in the request too, not just this one. The employee is
     * simply kept in that case, exactly as it would be for any other still-live reference.
     */
    private fun deleteUserAndLinkedEmployee(userId: Long): Boolean {
        val employeeId = userRepository.findById(userId).map { it.employee.id }.orElse(null)
        val userDeleted = userDetailsManager.deleteUserById(userId)

        if (userDeleted &&
            employeeId != null &&
            !employeeRepository.isReferencedOutsideUserAccounts(employeeId) &&
            !userRepository.existsByEmployeeId(employeeId)
        ) {
            employeeFacade.delete(employeeId)
            logger.info("Deleted employee {} linked to user account {} as part of a data-subject-request erasure", employeeId, userId)
        }

        return userDeleted
    }

    private fun folderName(type: DataSubjectMatchType): String = when (type) {
        DataSubjectMatchType.CUSTOMER -> "kunde"
        DataSubjectMatchType.USER_ACCOUNT -> "benutzerkonto"
        DataSubjectMatchType.EMPLOYEE_WITHOUT_ACCOUNT -> "mitarbeiter"
    }

    /**
     * Every area's own export is already a ZIP - a household's carries its master-data PDF, a
     * machine-readable `daten.json` and every uploaded document; a user's or employee's carries just
     * the PDF and `daten.json`. Each is unpacked here rather than nested as-is, so the combined
     * archive reads as one flat set of folders instead of a ZIP containing another ZIP. No name
     * collisions to guard against: [folder] already carries the match's type and id, so two matches
     * never share one, and a household's own entries are already unique among themselves
     * (`HouseholdExportService` dedupes those itself).
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

    private fun hasAreaPermission(type: DataSubjectMatchType): Boolean {
        val requiredAuthority = PERMISSION_BY_TYPE.getValue(type)
        val authentication = SecurityContextHolder.getContext().authentication as TafelJwtAuthentication
        return authentication.authorities.any { it.authority == requiredAuthority }
    }

    /**
     * `DATA_SUBJECT_REQUESTS` (checked at the controller) only grants reaching the search and
     * picking a match - the actual export/delete still needs that area's own permission, same as
     * triggering it from the household/user/Mitarbeiter screen directly (additive permission model,
     * issue #3396).
     */
    private fun requireAreaPermission(type: DataSubjectMatchType) {
        if (!hasAreaPermission(type)) {
            throw TafelApiException(
                HttpStatus.FORBIDDEN,
                "Für \"${type.title}\" ist die Berechtigung \"${PERMISSION_BY_TYPE.getValue(type)}\" erforderlich!",
            )
        }
    }
}
