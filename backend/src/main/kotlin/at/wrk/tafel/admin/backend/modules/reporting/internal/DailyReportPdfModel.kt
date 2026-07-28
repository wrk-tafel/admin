package at.wrk.tafel.admin.backend.modules.reporting.internal

import at.wrk.tafel.admin.backend.common.ExcludeFromTestCoverage
import com.fasterxml.jackson.annotation.JsonRootName
import java.math.BigDecimal

@JsonRootName("data")
@ExcludeFromTestCoverage
data class DailyReportPdfModel(
    val logoContentType: String,
    val logoBytes: ByteArray,
    val date: String,

    val employeeCount: Int,
    val countCustomers: Int,
    val countPersons: Int,
    val countInfants: Int,
    val averagePersonsPerCustomer: BigDecimal,
    val countCustomersNew: Int,
    val countPersonsNew: Int,
    val countCustomersProlonged: Int,
    val countPersonsProlonged: Int,
    val countCustomersUpdated: Int,
    val countSingleParentHouseholds: Int,

    val shopsTotalCount: Int,
    val shopsWithFoodCount: Int,
    val foodTotalAmount: BigDecimal,
    val foodPerShopAverage: BigDecimal,
    val routesLengthKm: Int,

    val shelters: List<DailyReportShelterPdfModel>,
    val personsInSheltersTotalCount: Int,
) {
    override fun equals(other: Any?): Boolean {
        if (this === other) return true
        if (javaClass != other?.javaClass) return false

        other as DailyReportPdfModel

        return logoContentType == other.logoContentType &&
            logoBytes.contentEquals(other.logoBytes) &&
            date == other.date &&
            employeeCount == other.employeeCount &&
            countCustomers == other.countCustomers &&
            countPersons == other.countPersons &&
            countInfants == other.countInfants &&
            averagePersonsPerCustomer == other.averagePersonsPerCustomer &&
            countCustomersNew == other.countCustomersNew &&
            countPersonsNew == other.countPersonsNew &&
            countCustomersProlonged == other.countCustomersProlonged &&
            countPersonsProlonged == other.countPersonsProlonged &&
            countCustomersUpdated == other.countCustomersUpdated &&
            countSingleParentHouseholds == other.countSingleParentHouseholds &&
            shopsTotalCount == other.shopsTotalCount &&
            shopsWithFoodCount == other.shopsWithFoodCount &&
            foodTotalAmount == other.foodTotalAmount &&
            foodPerShopAverage == other.foodPerShopAverage &&
            routesLengthKm == other.routesLengthKm &&
            shelters == other.shelters &&
            personsInSheltersTotalCount == other.personsInSheltersTotalCount
    }

    override fun hashCode(): Int {
        var result = logoContentType.hashCode()
        result = 31 * result + logoBytes.contentHashCode()
        result = 31 * result + date.hashCode()
        result = 31 * result + employeeCount
        result = 31 * result + countCustomers
        result = 31 * result + countPersons
        result = 31 * result + countInfants
        result = 31 * result + averagePersonsPerCustomer.hashCode()
        result = 31 * result + countCustomersNew
        result = 31 * result + countPersonsNew
        result = 31 * result + countCustomersProlonged
        result = 31 * result + countPersonsProlonged
        result = 31 * result + countCustomersUpdated
        result = 31 * result + countSingleParentHouseholds
        result = 31 * result + shopsTotalCount
        result = 31 * result + shopsWithFoodCount
        result = 31 * result + foodTotalAmount.hashCode()
        result = 31 * result + foodPerShopAverage.hashCode()
        result = 31 * result + routesLengthKm
        result = 31 * result + shelters.hashCode()
        result = 31 * result + personsInSheltersTotalCount
        return result
    }
}

@ExcludeFromTestCoverage
data class DailyReportShelterPdfModel(
    val name: String,
    val addressFormatted: String,
    val personCount: Int,
)
