package at.wrk.tafel.admin.backend.modules.logistics.model

import at.wrk.tafel.admin.backend.common.ExcludeFromTestCoverage
import at.wrk.tafel.admin.backend.modules.base.employee.Employee

@ExcludeFromTestCoverage
data class FoodCollectionData(
    val routeId: Long,
    val carId: Long?,
    val driver: Employee?,
    val coDriver: Employee?,
    val kmStart: Int?,
    val kmEnd: Int?,
    val items: List<FoodCollectionItem>
)

@ExcludeFromTestCoverage
data class FoodCollectionSaveRouteData(
    val carId: Long,
    val driverId: Long,
    val coDriverId: Long,
    val kmStart: Int,
    val kmEnd: Int,
)

@ExcludeFromTestCoverage
data class FoodCollectionItems(
    val items: List<FoodCollectionItem>
)

@ExcludeFromTestCoverage
data class FoodCollectionItem(
    val categoryId: Long,
    val shopId: Long,
    val amount: Int
)

@ExcludeFromTestCoverage
data class FoodCollectionSaveItemsPerShopData(
    val items: List<FoodCollectionCategoryAmount>
)

@ExcludeFromTestCoverage
data class FoodCollectionCategoryAmount(
    val categoryId: Long,
    val amount: Int
)
