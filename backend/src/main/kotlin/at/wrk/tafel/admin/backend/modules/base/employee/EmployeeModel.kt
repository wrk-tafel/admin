package at.wrk.tafel.admin.backend.modules.base.employee

import jakarta.validation.constraints.NotBlank

data class EmployeeListResponse(
    val items: List<EmployeeItem>,
    val totalCount: Long,
    val currentPage: Int,
    val totalPages: Int,
    val pageSize: Int,
)

/**
 * One employee as the list shows them: the record itself plus the user account referencing it, if
 * there is one. The account is only carried here - the personnel number is what joins the employee
 * admin screen and the user administration, and neither side used to show the other exists.
 */
data class EmployeeItem(
    val id: Long,
    val personnelNumber: String,
    val firstname: String,
    val lastname: String,
    val userAccount: EmployeeUserAccount? = null,
)

data class EmployeeUserAccount(
    val id: Long,
    val username: String,
)

data class EmployeeResponse(
    val id: Long,
    val personnelNumber: String,
    val firstname: String,
    val lastname: String,
)

/**
 * Whether a personnel number can still be given out, and - when it cannot - who holds it, so the
 * collision can be shown next to the field being typed into instead of as a failed save.
 */
data class PersonnelNumberAvailabilityResponse(
    val available: Boolean,
    val existingEmployee: EmployeeResponse? = null,
)

data class EmployeeRequest(
    @field:NotBlank
    val personnelNumber: String,
    @field:NotBlank
    val firstname: String,
    @field:NotBlank
    val lastname: String,
)

/**
 * Bound to `POST /employees/search`'s body rather than `?searchInput=...` query parameters - see
 * ADR-0057 (GDPR gap G25, issue #3506/#3703: a search term is a name, and a query string ends up in
 * the never-rotated `access.log`).
 */
data class EmployeeSearchRequest(
    val searchInput: String? = null,
    val page: Int? = null,
    val pageSize: Int? = null,
    val sortBy: String? = null,
    val sortDirection: String? = null,
)
