package at.wrk.tafel.admin.backend.database.model.distribution

import at.wrk.tafel.admin.backend.common.ExcludeFromTestCoverage
import at.wrk.tafel.admin.backend.database.model.base.BaseChangeTrackingEntity
import at.wrk.tafel.admin.backend.database.model.household.HouseholdEntity
import jakarta.persistence.Column
import jakarta.persistence.Entity
import jakarta.persistence.JoinColumn
import jakarta.persistence.ManyToOne
import jakarta.persistence.Table

@Entity(name = "DistributionHousehold")
@Table(name = "distributions_households")
@ExcludeFromTestCoverage
class DistributionHouseholdEntity : BaseChangeTrackingEntity() {

    @ManyToOne
    @JoinColumn(name = "distribution_id")
    var distribution: DistributionEntity? = null

    @ManyToOne
    @JoinColumn(name = "household_id")
    var household: HouseholdEntity? = null

    @Column(name = "ticket_number")
    var ticketNumber: Int? = null

    @Column(name = "processed")
    var processed: Boolean? = null

    @Column(name = "cost_contribution_paid")
    var costContributionPaid: Boolean? = true

}
