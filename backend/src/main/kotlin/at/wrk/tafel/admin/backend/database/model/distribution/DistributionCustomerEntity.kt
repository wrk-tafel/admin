package at.wrk.tafel.admin.backend.database.model.distribution

import at.wrk.tafel.admin.backend.common.ExcludeFromTestCoverage
import at.wrk.tafel.admin.backend.database.model.base.BaseChangeTrackingEntity
import at.wrk.tafel.admin.backend.database.model.customer.CustomerEntity
import jakarta.persistence.Column
import jakarta.persistence.Entity
import jakarta.persistence.JoinColumn
import jakarta.persistence.ManyToOne
import jakarta.persistence.Table

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

    @Column(name = "processed")
    var processed: Boolean? = null

}
