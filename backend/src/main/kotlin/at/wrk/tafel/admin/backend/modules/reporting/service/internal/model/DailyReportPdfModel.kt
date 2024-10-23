package at.wrk.tafel.admin.backend.modules.reporting.service.internal.model

import at.wrk.tafel.admin.backend.common.ExcludeFromTestCoverage
import com.fasterxml.jackson.dataformat.xml.annotation.JacksonXmlRootElement
import java.math.BigDecimal

@JacksonXmlRootElement(localName = "data")
@ExcludeFromTestCoverage
data class DailyReportPdfModel(
    val logoContentType: String,
    val logoBytes: ByteArray,
    val date: String,
    val countCustomers: Int,
    val countPersons: Int,
    val countInfants: Int,
    val averagePersonsPerCustomer: BigDecimal,
    val countCustomersNew: Int,
    val countPersonsNew: Int,
    val countCustomersProlonged: Int,
    val countPersonsProlonged: Int,
    val countCustomersUpdated: Int
) {
    override fun equals(other: Any?): Boolean {
        if (this === other) return true
        if (javaClass != other?.javaClass) return false

        other as DailyReportPdfModel

        if (logoContentType != other.logoContentType) return false
        if (!logoBytes.contentEquals(other.logoBytes)) return false
        if (date != other.date) return false
        if (countCustomers != other.countCustomers) return false
        if (countPersons != other.countPersons) return false
        if (countInfants != other.countInfants) return false
        if (averagePersonsPerCustomer != other.averagePersonsPerCustomer) return false
        if (countCustomersNew != other.countCustomersNew) return false
        if (countPersonsNew != other.countPersonsNew) return false
        if (countCustomersProlonged != other.countCustomersProlonged) return false
        if (countPersonsProlonged != other.countPersonsProlonged) return false
        if (countCustomersUpdated != other.countCustomersUpdated) return false

        return true
    }

    override fun hashCode(): Int {
        var result = logoContentType.hashCode()
        result = 31 * result + logoBytes.contentHashCode()
        result = 31 * result + date.hashCode()
        result = 31 * result + countCustomers
        result = 31 * result + countPersons
        result = 31 * result + countInfants
        result = 31 * result + averagePersonsPerCustomer.hashCode()
        result = 31 * result + countCustomersNew
        result = 31 * result + countPersonsNew
        result = 31 * result + countCustomersProlonged
        result = 31 * result + countPersonsProlonged
        result = 31 * result + countCustomersUpdated
        return result
    }

}
