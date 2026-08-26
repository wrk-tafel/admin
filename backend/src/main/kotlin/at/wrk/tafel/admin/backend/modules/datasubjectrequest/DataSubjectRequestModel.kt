package at.wrk.tafel.admin.backend.modules.datasubjectrequest

import at.wrk.tafel.admin.backend.common.ExcludeFromTestCoverage

/**
 * One search hit - a household, a user account, or an employee without one. [businessKey] is what
 * the record is addressed by outside this screen too (the household number, the username, the
 * personnel number); [id] is what [DataSubjectMatch] sends back to export/delete it.
 *
 * Only ever a `DataSubjectMatchListResponse` list element, never a request body or a standalone
 * response on its own - see the DTO naming convention for why this keeps the `Item` suffix.
 */
@ExcludeFromTestCoverage
data class DataSubjectMatchItem(
    val type: DataSubjectMatchType,
    val id: Long,
    val businessKey: String,
    val name: String,
)

/** Non-paginated full-list response, exempt from the `Request`/`Response`/`Item` suffix rule. */
@ExcludeFromTestCoverage
data class DataSubjectMatchListResponse(
    val items: List<DataSubjectMatchItem>,
)

/**
 * One picked search result, addressed the same way its own area's export/delete endpoint addresses
 * it (a household number, a user id, an employee id). Embedded field of [DataSubjectExportRequest]/
 * [DataSubjectDeleteRequest] only - never itself bound to a controller signature - so it keeps its
 * plain domain name rather than a `Request`/`Item` suffix.
 */
@ExcludeFromTestCoverage
data class DataSubjectMatch(
    val type: DataSubjectMatchType,
    val id: Long,
)

@ExcludeFromTestCoverage
data class DataSubjectExportRequest(
    val matches: List<DataSubjectMatch>,
)

@ExcludeFromTestCoverage
data class DataSubjectDeleteRequest(
    val matches: List<DataSubjectMatch>,
)

enum class DataSubjectDeleteOutcome {
    DELETED,
    NOT_FOUND,
}

/**
 * Deletion runs per match independently rather than all-or-nothing: unlike the combined export
 * (one downloaded file, so one failure aborts the whole request), a customer match and a staff
 * match here are two unrelated records, and one already having been removed by someone else in the
 * meantime shouldn't block deleting the other.
 */
@ExcludeFromTestCoverage
data class DataSubjectDeleteResultItem(
    val match: DataSubjectMatch,
    val outcome: DataSubjectDeleteOutcome,
)

@ExcludeFromTestCoverage
data class DataSubjectDeleteResponse(
    val results: List<DataSubjectDeleteResultItem>,
)
