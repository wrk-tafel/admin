package at.wrk.tafel.admin.backend.modules.customer.masterdata

import java.time.LocalDate
import java.time.LocalDateTime

interface MasterdataPdfService {
    fun generatePdf(customer: MasterdataPdfCustomer): ByteArray
}

data class MasterdataPdfCustomer(
    val lastname: String,
    val firstname: String,
    val birthDate: LocalDate,
    val address: MasterdataPdfAddressData,
    val additionalPersons: List<MasterdataPdfAdditionalPersonData> = emptyList()
)

data class MasterdataPdfAddressData(
    val street: String,
    val houseNumber: String,
    val door: String,
    val stairway: String? = null,
    val postalCode: Int,
    val city: String
)

data class MasterdataPdfAdditionalPersonData(
    val lastname: String,
    val firstname: String,
    val birthDate: LocalDateTime
)
