package at.wrk.tafel.admin.backend.database.model.distribution

import at.wrk.tafel.admin.backend.common.ExcludeFromTestCoverage
import at.wrk.tafel.admin.backend.database.model.base.BaseChangeTrackingEntity
import at.wrk.tafel.admin.backend.database.model.household.HouseholdEntity
import jakarta.persistence.Column
import jakarta.persistence.Entity
import jakarta.persistence.JoinColumn
import jakarta.persistence.ManyToOne
import jakarta.persistence.Table

/**
 * One ticket of a distribution. Usually it belongs to a [household]; a goodwill package
 * ("Kulanzpaket", [goodwill]) belongs to none and records only the persons it is for
 * (`ck_distributions_households_goodwill` enforces exactly one of the two shapes).
 */
@Entity(name = "DistributionHousehold")
@Table(name = "distributions_households")
@ExcludeFromTestCoverage
class DistributionHouseholdEntity(
    @ManyToOne
    @JoinColumn(name = "distribution_id", nullable = false)
    var distribution: DistributionEntity,
    @ManyToOne
    @JoinColumn(name = "household_id")
    var household: HouseholdEntity?,
    @Column(name = "ticket_number")
    var ticketNumber: Int,
    @Column(name = "processed")
    var processed: Boolean = false,
    @Column(name = "cost_contribution_paid")
    var costContributionPaid: Boolean = true,
    /** Closed without being served - the household wasn't there. Only meaningful while [processed]. */
    @Column(name = "skipped")
    var skipped: Boolean = false,
    @Column(name = "goodwill")
    var goodwill: Boolean = false,
    @Column(name = "goodwill_person_count")
    var goodwillPersonCount: Int? = null,
    @Column(name = "goodwill_infant_count")
    var goodwillInfantCount: Int? = null,
) : BaseChangeTrackingEntity()
