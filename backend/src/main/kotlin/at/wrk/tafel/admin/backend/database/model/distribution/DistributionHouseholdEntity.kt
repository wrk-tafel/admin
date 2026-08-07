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
class DistributionHouseholdEntity(
    @ManyToOne
    @JoinColumn(name = "distribution_id", nullable = false)
    var distribution: DistributionEntity,
    @ManyToOne
    @JoinColumn(name = "household_id", nullable = false)
    var household: HouseholdEntity,
    @Column(name = "ticket_number")
    var ticketNumber: Int,
    @Column(name = "processed")
    var processed: Boolean = false,
    @Column(name = "cost_contribution_paid")
    var costContributionPaid: Boolean = true,
) : BaseChangeTrackingEntity()
