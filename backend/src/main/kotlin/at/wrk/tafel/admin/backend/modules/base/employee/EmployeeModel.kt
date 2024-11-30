package at.wrk.tafel.admin.backend.modules.base.employee

data class EmployeeListResponse(
    val items: List<Employee>
)

data class Employee(
    val id: Long,
    val personnelNumber: String,
    val firstname: String,
    val lastname: String,
)

data class EmployeeCreateRequest(
    val personnelNumber: String,
    val firstname: String,
    val lastname: String,
)
