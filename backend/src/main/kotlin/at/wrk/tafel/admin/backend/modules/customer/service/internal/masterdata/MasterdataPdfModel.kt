package at.wrk.tafel.admin.backend.modules.customer.service.internal.masterdata

import at.wrk.tafel.admin.backend.common.ExcludeFromTestCoverage
import com.fasterxml.jackson.dataformat.xml.annotation.JacksonXmlRootElement

@JacksonXmlRootElement(localName = "data")
@ExcludeFromTestCoverage
data class PdfData(
    val logoContentType: String,
    val logoBytes: ByteArray,
    val issuer: String?,
    val issuedAtDate: String,
    val customer: PdfCustomerData,
    val countPersons: Int,
    val countInfants: Int
) {
    override fun equals(other: Any?): Boolean {
        if (this === other) return true
        if (javaClass != other?.javaClass) return false

        other as PdfData

        if (logoContentType != other.logoContentType) return false
        if (!logoBytes.contentEquals(other.logoBytes)) return false
        if (issuedAtDate != other.issuedAtDate) return false
        if (customer != other.customer) return false
        if (countPersons != other.countPersons) return false
        if (countInfants != other.countInfants) return false

        return true
    }

    override fun hashCode(): Int {
        var result = logoContentType.hashCode()
        result = 31 * result + logoBytes.contentHashCode()
        result = 31 * result + issuedAtDate.hashCode()
        result = 31 * result + customer.hashCode()
        result = 31 * result + countPersons
        result = 31 * result + countInfants
        return result
    }
}

@ExcludeFromTestCoverage
data class PdfCustomerData(
    val id: Long,
    val lastname: String?,
    val firstname: String?,
    val birthDate: String,
    val gender: String?,
    val country: String,
    val telephoneNumber: String? = null,
    val email: String? = null,
    val address: PdfAddressData,
    val employer: String,
    val income: String? = null,
    val incomeDueDate: String? = null,
    val additionalPersons: List<PdfAdditionalPersonData> = emptyList(),
    val idCard: PdfIdCardData? = null
)

@ExcludeFromTestCoverage
data class PdfAddressData(
    val street: String,
    val houseNumber: String?,
    val door: String? = null,
    val stairway: String? = null,
    val postalCode: Int?,
    val city: String
)

@ExcludeFromTestCoverage
data class PdfAdditionalPersonData(
    val lastname: String,
    val firstname: String,
    val birthDate: String,
    val gender: String?,
    val country: String,
    val employer: String? = null,
    val income: String? = null,
    val incomeDueDate: String? = null
)

@ExcludeFromTestCoverage
data class PdfIdCardData(
    val qrCodeContentType: String,
    val qrCodeBytes: ByteArray
) {
    override fun equals(other: Any?): Boolean {
        if (this === other) return true
        if (javaClass != other?.javaClass) return false

        other as PdfIdCardData

        if (qrCodeContentType != other.qrCodeContentType) return false
        if (!qrCodeBytes.contentEquals(other.qrCodeBytes)) return false

        return true
    }

    override fun hashCode(): Int {
        var result = qrCodeContentType.hashCode()
        result = 31 * result + qrCodeBytes.contentHashCode()
        return result
    }
}