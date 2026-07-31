package at.wrk.tafel.admin.backend.modules.base.employee

import jakarta.validation.constraints.NotBlank

data class EmployeeListResponse(
    val items: List<Employee>,
    val totalCount: Long,
    val currentPage: Int,
    val totalPages: Int,
    val pageSize: Int,
)

data class Employee(
    val id: Long,
    val personnelNumber: String,
    val firstname: String,
    val lastname: String,
)

data class EmployeeCreateRequest(
    @field:NotBlank
    val personnelNumber: String,
    @field:NotBlank
    val firstname: String,
    @field:NotBlank
    val lastname: String,
)
