package at.wrk.tafel.admin.backend.database.entities.distribution

import at.wrk.tafel.admin.backend.common.ExcludeFromTestCoverage
import at.wrk.tafel.admin.backend.database.entities.base.BaseChangeTrackingEntity
import at.wrk.tafel.admin.backend.database.entities.customer.CustomerEntity
import jakarta.persistence.*

@Entity(name = "DistributionCustomer")
@Table(name = "distributions_customers")
@ExcludeFromTestCoverage
class DistributionCustomerEntity : BaseChangeTrackingEntity() {

    @ManyToOne
    @JoinColumn(name = "distribution_id")
    var distribution: DistributionEntity? = null

    @ManyToOne
    @JoinColumn(name = "customer_id")
    var customer: CustomerEntity? = null

    @Column(name = "ticket_number")
    var ticketNumber: Int? = null

}
