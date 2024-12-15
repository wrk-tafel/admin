package at.wrk.tafel.admin.backend.database.model.distribution

import at.wrk.tafel.admin.backend.common.ExcludeFromTestCoverage
import at.wrk.tafel.admin.backend.database.model.base.BaseChangeTrackingEntity
import jakarta.persistence.Column
import jakarta.persistence.Entity
import jakarta.persistence.JoinColumn
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

    @Column(name = "count_customers")
    var countCustomers: Int? = null

    @Column(name = "count_persons")
    var countPersons: Int? = null

    @Column(name = "count_infants")
    var countInfants: Int? = null

    @Column(name = "average_persons_per_customer")
    var averagePersonsPerCustomer: BigDecimal? = null

    @Column(name = "count_customers_new")
    var countCustomersNew: Int? = null

    @Column(name = "count_persons_new")
    var countPersonsNew: Int? = null

    @Column(name = "count_customers_prolonged")
    var countCustomersProlonged: Int? = null

    @Column(name = "count_persons_prolonged")
    var countPersonsProlonged: Int? = null

    @Column(name = "count_customers_updated")
    var countCustomersUpdated: Int? = null

    @Column(name = "shops_total_count")
    var shopsTotalCount: Int? = null

    @Column(name = "shops_with_food_count")
    var shopsWithFoodCount: Int? = null

    @Column(name = "food_total_amount")
    var foodTotalAmount: BigDecimal? = null

    @Column(name = "food_per_shop_average")
    var foodPerShopAverage: BigDecimal? = null

    @Column(name = "routes_length_km")
    var routesLengthKm: Int? = null

    @Column(name = "employee_count")
    var employeeCount: Int? = null

    @Column(name = "persons_in_shelter_count")
    var personsInShelterCount: Int? = null

}
