package at.wrk.tafel.admin.backend.database.entities.distribution

import at.wrk.tafel.admin.backend.common.ExcludeFromTestCoverage
import at.wrk.tafel.admin.backend.database.entities.base.BaseChangeTrackingEntity
import jakarta.persistence.*
import java.math.BigDecimal

@Entity(name = "DistributionStatistic")
@Table(name = "distributions_statistics")
@ExcludeFromTestCoverage
class DistributionStatisticEntity : BaseChangeTrackingEntity() {

    @ManyToOne
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

    @Column(name = "count_customers_prolonged")
    var countCustomersProlonged: Int? = null

    @Column(name = "count_customers_updated")
    var countCustomersUpdated: Int? = null

}
