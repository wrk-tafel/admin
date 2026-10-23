package at.wrk.tafel.admin.backend.database.model.logistics

import at.wrk.tafel.admin.backend.common.ExcludeFromTestCoverage
import jakarta.persistence.Column
import jakarta.persistence.Embeddable
import jakarta.persistence.JoinColumn
import jakarta.persistence.ManyToOne

/**
 * An amount a shelter gets every time, e.g. 4 boxes of bread - in whole boxes of one food category,
 * with an optional [note] to tell several of the same category apart ("Schnittbrot").
 */
@Embeddable
@ExcludeFromTestCoverage
class ShelterFixedQuantityEntity(
    @ManyToOne
    @JoinColumn(name = "food_category_id", nullable = false)
    var foodCategory: FoodCategoryEntity,
    @Column(name = "amount", nullable = false)
    var amount: Int,
    @Column(name = "note")
    var note: String? = null,
)
