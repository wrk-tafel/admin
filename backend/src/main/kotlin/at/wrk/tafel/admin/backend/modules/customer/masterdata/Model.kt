package at.wrk.tafel.admin.backend.modules.customer.masterdata

import at.wrk.tafel.admin.backend.common.ExcludeFromTestCoverage
import com.fasterxml.jackson.annotation.JsonIgnore
import com.fasterxml.jackson.dataformat.xml.annotation.JacksonXmlRootElement
import java.time.LocalDate
import java.time.Period

@JacksonXmlRootElement(localName = "data")
@ExcludeFromTestCoverage
data class MasterdataPdfData(
    val logoContentType: String,
    val logoBytes: ByteArray,
    val currentDate: String,
    val customer: MasterdataPdfCustomer,
    val countPersons: Int,
    val countInfants: Int
) {
    override fun equals(other: Any?): Boolean {
        if (this === other) return true
        if (javaClass != other?.javaClass) return false

        other as MasterdataPdfData

        if (logoContentType != other.logoContentType) return false
        if (!logoBytes.contentEquals(other.logoBytes)) return false
        if (customer != other.customer) return false

        return true
    }

    override fun hashCode(): Int {
        var result = logoContentType.hashCode()
        result = 31 * result + logoBytes.contentHashCode()
        result = 31 * result + customer.hashCode()
        return result
    }
}

@ExcludeFromTestCoverage
data class MasterdataPdfCustomer(
    val id: Long,
    val lastname: String,
    val firstname: String,
    val birthDate: String,
    val telephoneNumber: Long? = null,
    val email: String? = null,
    val address: MasterdataPdfAddressData,
    val employer: String,
    val additionalPersons: List<MasterdataPdfAdditionalPersonData> = emptyList()
)

@ExcludeFromTestCoverage
data class MasterdataPdfAddressData(
    val street: String,
    val houseNumber: String,
    val door: String,
    val stairway: String? = null,
    val postalCode: Int,
    val city: String
)

@ExcludeFromTestCoverage
data class MasterdataPdfAdditionalPersonData(
    val lastname: String,
    val firstname: String,
    val birthDate: String
)