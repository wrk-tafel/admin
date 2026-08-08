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
    @ManyToOne
    @JoinColumn(nullable = false)
    var route: RouteEntity,
) : BaseChangeTrackingEntity() {

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
     * `push` decides from it whether a distribution closed with recording still outstanding. Return
     * items are deliberately not part of it - not every route brings any back.
     */
    fun isFullyRecorded(): Boolean = car != null &&
        driver != null &&
        coDriver != null &&
        kmStart != null &&
        kmEnd != null &&
        !items.isNullOrEmpty()
}
