package at.wrk.tafel.admin.backend.database.model.household

import at.wrk.tafel.admin.backend.common.ExcludeFromTestCoverage
import at.wrk.tafel.admin.backend.database.model.auth.UserEntity
import at.wrk.tafel.admin.backend.database.model.base.BaseChangeTrackingEntity
import jakarta.persistence.Column
import jakarta.persistence.Entity
import jakarta.persistence.JoinColumn
import jakarta.persistence.ManyToOne
import jakarta.persistence.Table

@Entity(name = "HouseholdNote")
@Table(name = "household_notes")
@ExcludeFromTestCoverage
class HouseholdNoteEntity(
    @ManyToOne
    @JoinColumn(name = "household_id", nullable = false)
    var household: HouseholdEntity,
    @Column(name = "note")
    var note: String,
) : BaseChangeTrackingEntity() {

    /** The account that wrote the note; empty once that account has been deleted. */
    @ManyToOne
    @JoinColumn(name = "author_user_id", nullable = true)
    var author: UserEntity? = null
}
