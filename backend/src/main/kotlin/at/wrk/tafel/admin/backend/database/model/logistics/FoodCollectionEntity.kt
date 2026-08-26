package at.wrk.tafel.admin.backend.database.model.logistics

import at.wrk.tafel.admin.backend.common.ExcludeFromTestCoverage
import at.wrk.tafel.admin.backend.database.model.base.BaseChangeTrackingEntity
import at.wrk.tafel.admin.backend.database.model.base.EmployeeEntity
import at.wrk.tafel.admin.backend.database.model.distribution.DistributionEntity
import jakarta.persistence.CollectionTable
import jakarta.persistence.Column
import jakarta.persistence.ElementCollection
import jakarta.persistence.Entity
import jakarta.persistence.JoinColumn
import jakarta.persistence.ManyToOne
import jakarta.persistence.OneToOne
import jakarta.persistence.Table

@Entity(name = "FoodCollection")
@Table(name = "food_collections")
@ExcludeFromTestCoverage
class FoodCollectionEntity(
    @ManyToOne
    @JoinColumn(nullable = false)
    var distribution: DistributionEntity,
    route: RouteEntity,
) : BaseChangeTrackingEntity() {

    @ManyToOne
    @JoinColumn(name = "route_id", nullable = false)
    final var route: RouteEntity = route
        private set

    /**
     * The route's name at the time this collection was last recorded, stored rather than derived on
     * read: `route.name` is editable master data, so reading it live would retroactively rewrite the
     * "Route" column of the TOeT_Spenden export for distributions that already happened whenever a
     * route gets renamed - the same reason [FoodCollectionItemEntity.weight] is stored instead of
     * recomputed.
     */
    @Column(name = "route_name", nullable = false)
    final var routeName: String = route.name
        private set

    /** The only way to change [route], so [routeName] can never fall out of sync with it. */
    fun updateRoute(newRoute: RouteEntity) {
        route = newRoute
        routeName = newRoute.name
    }

    @OneToOne
    @JoinColumn(name = "car_id", referencedColumnName = "id")
    var car: CarEntity? = null

    @OneToOne
    @JoinColumn(name = "driver_employee_id", referencedColumnName = "id")
    var driver: EmployeeEntity? = null

    @OneToOne
    @JoinColumn(name = "co_driver_employee_id", referencedColumnName = "id")
    var coDriver: EmployeeEntity? = null

    @Column(name = "km_start")
    var kmStart: Int? = null

    @Column(name = "km_end")
    var kmEnd: Int? = null

    @ElementCollection
    @CollectionTable(
        name = "food_collections_items",
        joinColumns = [JoinColumn(name = "food_collection_id")],
    )
    var items: List<FoodCollectionItemEntity>? = null

    @ElementCollection
    @CollectionTable(
        name = "food_collections_return_items",
        joinColumns = [JoinColumn(name = "food_collection_id")],
    )
    var returnItems: List<FoodCollectionReturnItemEntity>? = null

    /**
     * A route only counts as recorded once the whole trip is done: base data (car/driver/co-driver/
     * mileage) plus the picked-up food items - a row can otherwise exist with only one of the two
     * (see `FoodCollectionService.getOrCreateFoodCollectionEntity`).
     *
     * Lives on the entity rather than in either caller because two modules ask the same question and
     * have to agree on the answer: `dashboard` counts recorded routes for its progress display, and
     * `logistics` decides from it when the last outstanding route has been recorded. Return items
     * are deliberately not part of it - not every route brings any back.
     */
    fun isFullyRecorded(): Boolean = car != null &&
        driver != null &&
        coDriver != null &&
        kmStart != null &&
        kmEnd != null &&
        !items.isNullOrEmpty()
}
