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
class FoodCollectionEntity : BaseChangeTrackingEntity() {

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

    @ManyToOne
    var distribution: DistributionEntity? = null

    @ManyToOne
    var route: RouteEntity? = null

    @ElementCollection
    @CollectionTable(
        name = "food_collections_items",
        joinColumns = [JoinColumn(name = "food_collection_id")]
    )
    var items: List<FoodCollectionItemEntity>? = null

}
