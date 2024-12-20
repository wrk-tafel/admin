package at.wrk.tafel.admin.backend.modules.logistics.model

import at.wrk.tafel.admin.backend.common.ExcludeFromTestCoverage

@ExcludeFromTestCoverage
data class CarListResponse(
    val cars: List<Car>
)

@ExcludeFromTestCoverage
data class Car(
    val id: Long,
    val licensePlate: String,
    val name: String
)
