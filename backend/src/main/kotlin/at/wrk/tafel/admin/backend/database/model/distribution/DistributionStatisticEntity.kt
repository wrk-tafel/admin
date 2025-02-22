package at.wrk.tafel.admin.backend.database.model.distribution

import at.wrk.tafel.admin.backend.common.ExcludeFromTestCoverage
import at.wrk.tafel.admin.backend.database.model.base.BaseChangeTrackingEntity
import jakarta.persistence.CascadeType
import jakarta.persistence.Column
import jakarta.persistence.Entity
import jakarta.persistence.FetchType
import jakarta.persistence.JoinColumn
import jakarta.persistence.OneToMany
import jakarta.persistence.OneToOne
import jakarta.persistence.Table
import java.math.BigDecimal

@Entity(name = "DistributionStatistic")
@Table(name = "distributions_statistics")
@ExcludeFromTestCoverage
class DistributionStatisticEntity : BaseChangeTrackingEntity() {

    @OneToOne
    @JoinColumn(name = "distribution_id")
    var distribution: DistributionEntity? = null

    @OneToMany(mappedBy = "statistic", cascade = [CascadeType.ALL], orphanRemoval = true, fetch = FetchType.EAGER)
    var shelters: MutableList<DistributionStatisticShelterEntity> = mutableListOf()

    @Column(name = "count_customers")
    var countCustomers: Int = 0

    @Column(name = "count_persons")
    var countPersons: Int = 0

    @Column(name = "count_infants")
    var countInfants: Int = 0

    @Column(name = "average_persons_per_customer")
    var averagePersonsPerCustomer: BigDecimal = BigDecimal.ZERO

    @Column(name = "count_customers_new")
    var countCustomersNew: Int = 0

    @Column(name = "count_persons_new")
    var countPersonsNew: Int = 0

    @Column(name = "count_customers_prolonged")
    var countCustomersProlonged: Int = 0

    @Column(name = "count_persons_prolonged")
    var countPersonsProlonged: Int = 0

    @Column(name = "count_customers_updated")
    var countCustomersUpdated: Int = 0

    @Column(name = "shops_total_count")
    var shopsTotalCount: Int = 0

    @Column(name = "shops_with_food_count")
    var shopsWithFoodCount: Int = 0

    @Column(name = "food_total_amount")
    var foodTotalAmount: BigDecimal = BigDecimal.ZERO

    @Column(name = "food_per_shop_average")
    var foodPerShopAverage: BigDecimal = BigDecimal.ZERO

    @Column(name = "routes_length_km")
    var routesLengthKm: Int = 0

    @Column(name = "employee_count")
    var employeeCount: Int = 0

    @Column(name = "persons_in_shelter_count")
    @Deprecated("Use shelters instead - remove earliest in 2026")
    var personsInShelterCount: Int = 0

    fun isEmpty(): Boolean {
        return countCustomers == 0 &&
                countPersons == 0 &&
                countInfants == 0 &&
                BigDecimal.ZERO.compareTo(averagePersonsPerCustomer) == 0 &&
                countCustomersNew == 0 &&
                countPersonsNew == 0 &&
                countCustomersProlonged == 0 &&
                countPersonsProlonged == 0 &&
                countCustomersUpdated == 0 &&
                shopsTotalCount == 0 &&
                shopsWithFoodCount == 0 &&
                BigDecimal.ZERO.compareTo(foodTotalAmount) == 0 &&
                BigDecimal.ZERO.compareTo(foodPerShopAverage) == 0 &&
                routesLengthKm == 0 &&
                employeeCount == 0 &&
                personsInShelterCount == 0 &&
                shelters.isEmpty()
    }

}
