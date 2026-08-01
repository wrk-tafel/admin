package at.wrk.tafel.admin.backend.modules.logistics.model

import at.wrk.tafel.admin.backend.common.ExcludeFromTestCoverage
import at.wrk.tafel.admin.backend.modules.base.employee.EmployeeResponse
import jakarta.validation.Valid
import jakarta.validation.constraints.NotEmpty
import jakarta.validation.constraints.Positive
import jakarta.validation.constraints.PositiveOrZero

@ExcludeFromTestCoverage
data class FoodCollectionResponse(
    val routeId: Long,
    val carId: Long?,
    val driver: EmployeeResponse?,
    val coDriver: EmployeeResponse?,
    val kmStart: Int?,
    val kmEnd: Int?,
    val items: List<FoodCollectionItem>,
)

@ExcludeFromTestCoverage
data class FoodCollectionSaveRouteRequest(
    @field:Positive
    val carId: Long,
    @field:Positive
    val driverId: Long,
    @field:Positive
    val coDriverId: Long,
    @field:PositiveOrZero
    val kmStart: Int,
    @field:PositiveOrZero
    val kmEnd: Int,
)

@ExcludeFromTestCoverage
data class FoodCollectionItemsRequest(
    @field:NotEmpty
    @field:Valid
    val items: List<FoodCollectionItem>,
)

@ExcludeFromTestCoverage
data class FoodCollectionItemsResponse(
    val items: List<FoodCollectionItem>,
)

@ExcludeFromTestCoverage
data class FoodCollectionItem(
    @field:Positive
    val categoryId: Long,
    @field:Positive
    val shopId: Long,
    @field:PositiveOrZero
    val amount: Int,
)

@ExcludeFromTestCoverage
data class FoodCollectionItemRequest(
    @field:Positive
    val categoryId: Long,
    @field:Positive
    val shopId: Long,
    @field:PositiveOrZero
    val amount: Int,
)

@ExcludeFromTestCoverage
data class FoodCollectionSaveItemsPerShopRequest(
    @field:NotEmpty
    @field:Valid
    val items: List<FoodCollectionCategoryAmount>,
)

@ExcludeFromTestCoverage
data class FoodCollectionCategoryAmount(
    @field:Positive
    val categoryId: Long,
    @field:PositiveOrZero
    val amount: Int,
)
