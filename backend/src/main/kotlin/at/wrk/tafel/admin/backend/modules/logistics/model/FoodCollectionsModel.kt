package at.wrk.tafel.admin.backend.modules.logistics.model

import at.wrk.tafel.admin.backend.common.ExcludeFromTestCoverage

@ExcludeFromTestCoverage
data class FoodCollectionSaveRequest(
    val routeId: Long,
    val carId: Long,
    val driverId: Long,
    val coDriverId: Long,
    val kmStart: Int,
    val kmEnd: Int,
    val items: List<FoodCollectionItem>
)

@ExcludeFromTestCoverage
data class FoodCollectionItem(
    val categoryId: Long,
    val shopId: Long,
    val amount: Int
)

@ExcludeFromTestCoverage
data class FoodCollectionData(
    val items: List<FoodCollectionItem>
)
