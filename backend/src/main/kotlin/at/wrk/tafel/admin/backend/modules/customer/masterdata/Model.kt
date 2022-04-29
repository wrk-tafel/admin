package at.wrk.tafel.admin.backend.modules.customer.masterdata

import com.fasterxml.jackson.dataformat.xml.annotation.JacksonXmlRootElement

@JacksonXmlRootElement(localName = "data")
data class MasterdataPdfData(
    val logoContentType: String,
    val logoBytes: ByteArray,
    val customer: MasterdataPdfCustomer
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
