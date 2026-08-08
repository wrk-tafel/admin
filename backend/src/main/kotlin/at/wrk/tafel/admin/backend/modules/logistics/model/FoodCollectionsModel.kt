package at.wrk.tafel.admin.backend.modules.logistics.model

import at.wrk.tafel.admin.backend.common.ExcludeFromTestCoverage
import at.wrk.tafel.admin.backend.modules.base.employee.EmployeeResponse
import jakarta.validation.Valid
import jakarta.validation.constraints.NotBlank
import jakarta.validation.constraints.NotEmpty
import jakarta.validation.constraints.Positive
import jakarta.validation.constraints.PositiveOrZero
import jakarta.validation.constraints.Size

@ExcludeFromTestCoverage
data class FoodCollectionResponse(
    val routeId: Long,
    val carId: Long?,
    val driver: EmployeeResponse?,
    val coDriver: EmployeeResponse?,
    val kmStart: Int?,
    val kmEnd: Int?,
    val items: List<FoodCollectionItem>,
    val returnItems: List<FoodCollectionReturnItem>,
)

@ExcludeFromTestCoverage
data class FoodCollectionSaveRouteRequest(
    @field:Positive
    val carId: Long,
    @field:Positive
    val driverId: Long,
    @field:Positive
    val coDriverId: Long,
)

@ExcludeFromTestCoverage
data class FoodCollectionSaveKmRequest(
    @field:PositiveOrZero
    val kmStart: Int,
    @field:PositiveOrZero
    val kmEnd: Int,
)

@ExcludeFromTestCoverage
data class FoodCollectionItemsRequest(
    @field:NotEmpty
    val items: List<@Valid FoodCollectionItem>,
)

@ExcludeFromTestCoverage
data class FoodCollectionItemsResponse(
    val items: List<FoodCollectionItem>,
    val returnItems: List<FoodCollectionReturnItem>,
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
    val items: List<@Valid FoodCollectionCategoryAmount>,
)

@ExcludeFromTestCoverage
data class FoodCollectionCategoryAmount(
    @field:Positive
    val categoryId: Long,
    @field:PositiveOrZero
    val amount: Int,
)

@ExcludeFromTestCoverage
data class FoodCollectionReturnItem(
    @field:Positive
    val shopId: Long,
    @field:NotBlank
    @field:Size(max = 100)
    val description: String,
    @field:PositiveOrZero
    val amount: Int,
)

@ExcludeFromTestCoverage
data class FoodCollectionReturnItemAmount(
    @field:NotBlank
    @field:Size(max = 100)
    val description: String,
    @field:PositiveOrZero
    val amount: Int,
)

@ExcludeFromTestCoverage
data class FoodCollectionSaveReturnItemsRequest(
    val returnItems: List<@Valid FoodCollectionReturnItem>,
)

@ExcludeFromTestCoverage
data class FoodCollectionSaveReturnItemsPerShopRequest(
    val returnItems: List<@Valid FoodCollectionReturnItemAmount>,
)
