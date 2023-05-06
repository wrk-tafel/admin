package at.wrk.tafel.admin.backend.modules.distribution.model

import at.wrk.tafel.admin.backend.common.ExcludeFromTestCoverage
import com.fasterxml.jackson.dataformat.xml.annotation.JacksonXmlRootElement

@ExcludeFromTestCoverage
data class CustomerListPdfResult(
    val filename: String,
    val bytes: ByteArray
) {
    override fun equals(other: Any?): Boolean {
        if (this === other) return true
        if (javaClass != other?.javaClass) return false

        other as CustomerListPdfResult

        if (filename != other.filename) return false
        return bytes.contentEquals(other.bytes)
    }

    override fun hashCode(): Int {
        var result = filename.hashCode()
        result = 31 * result + bytes.contentHashCode()
        return result
    }
}

@JacksonXmlRootElement(localName = "data")
@ExcludeFromTestCoverage
data class CustomerListPdfModel(
    val title: String,
    val customers: List<CustomerListItem>
)

@ExcludeFromTestCoverage
data class CustomerListItem(
    val ticketNumber: Int,
    val customerId: Long,
    val name: String,
    val countPersons: Int,
    val countInfants: Int
)
