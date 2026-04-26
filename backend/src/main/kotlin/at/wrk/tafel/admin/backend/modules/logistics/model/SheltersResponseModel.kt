package at.wrk.tafel.admin.backend.modules.logistics.model

import at.wrk.tafel.admin.backend.common.ExcludeFromTestCoverage

@ExcludeFromTestCoverage
data class ShelterListResponse(
    val shelters: List<Shelter>
)

@ExcludeFromTestCoverage
data class Shelter(
    val id: Long?,
    val name: String,
    var addressStreet: String,
    var addressHouseNumber: String,
    var addressStairway: String?,
    var addressDoor: String?,
    var addressPostalCode: Int,
    var addressCity: String,
    val note: String?,
    val personsCount: Int,
    val enabled: Boolean,
    val contacts: List<ShelterContact>,
)

@ExcludeFromTestCoverage
data class ShelterContact(
    val firstname: String?,
    val lastname: String?,
    var phone: String,
)
