package at.wrk.tafel.admin.backend.database.model.push

import at.wrk.tafel.admin.backend.common.ExcludeFromTestCoverage
import at.wrk.tafel.admin.backend.database.model.auth.UserEntity
import at.wrk.tafel.admin.backend.database.model.base.BaseChangeTrackingEntity
import jakarta.persistence.Column
import jakarta.persistence.Entity
import jakarta.persistence.JoinColumn
import jakarta.persistence.ManyToOne
import jakarta.persistence.Table

@Entity(name = "PushPreferences")
@Table(name = "push_preferences")
@ExcludeFromTestCoverage
class PushPreferencesEntity : BaseChangeTrackingEntity() {

    @ManyToOne
    @JoinColumn(name = "user_id", nullable = false)
    var user: UserEntity? = null

    @Column(name = "enabled")
    var enabled: Boolean = true
}
