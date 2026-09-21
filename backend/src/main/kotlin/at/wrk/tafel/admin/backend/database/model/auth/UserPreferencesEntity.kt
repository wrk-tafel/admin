package at.wrk.tafel.admin.backend.database.model.auth

import at.wrk.tafel.admin.backend.common.ExcludeFromTestCoverage
import at.wrk.tafel.admin.backend.database.model.base.BaseChangeTrackingEntity
import jakarta.persistence.Column
import jakarta.persistence.Entity
import jakarta.persistence.EnumType
import jakarta.persistence.Enumerated
import jakarta.persistence.JoinColumn
import jakarta.persistence.ManyToOne
import jakarta.persistence.Table

/**
 * A user's display preferences. One row per user, created on the first change; a user without one
 * has the defaults.
 */
@Entity(name = "UserPreferences")
@Table(name = "user_preferences")
@ExcludeFromTestCoverage
class UserPreferencesEntity : BaseChangeTrackingEntity() {

    @ManyToOne
    @JoinColumn(name = "user_id", nullable = false)
    var user: UserEntity? = null

    @Enumerated(EnumType.STRING)
    @Column(name = "theme")
    var theme: UserTheme = UserTheme.SYSTEM
}

enum class UserTheme {
    LIGHT,
    DARK,

    /** Follows the operating system's light/dark setting. */
    SYSTEM,
}
