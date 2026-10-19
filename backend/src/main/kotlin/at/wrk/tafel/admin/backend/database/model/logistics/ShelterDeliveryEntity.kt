package at.wrk.tafel.admin.backend.database.model.logistics

import at.wrk.tafel.admin.backend.common.ExcludeFromTestCoverage
import at.wrk.tafel.admin.backend.database.model.auth.UserEntity
import at.wrk.tafel.admin.backend.database.model.base.BaseChangeTrackingEntity
import jakarta.persistence.Entity
import jakarta.persistence.JoinColumn
import jakarta.persistence.ManyToOne
import jakarta.persistence.Table

/**
 * A driver's confirmation that one of the shelters picked for the route that day has got its goods -
 * the shelter counterpart of [RouteStopCompletionEntity], keyed by the food collection rather than
 * by a date, since that is where the day's shelters are picked.
 */
@Entity(name = "ShelterDelivery")
@Table(name = "food_collections_shelter_deliveries")
@ExcludeFromTestCoverage
class ShelterDeliveryEntity(
    @ManyToOne
    @JoinColumn(name = "food_collection_id", nullable = false)
    var foodCollection: FoodCollectionEntity,
    @ManyToOne
    @JoinColumn(name = "shelter_id", nullable = false)
    var shelter: ShelterEntity,
) : BaseChangeTrackingEntity() {

    /** The account that confirmed the delivery; empty once that account has been deleted. */
    @ManyToOne
    @JoinColumn(name = "delivered_by_user_id", nullable = true)
    var deliveredBy: UserEntity? = null
}
