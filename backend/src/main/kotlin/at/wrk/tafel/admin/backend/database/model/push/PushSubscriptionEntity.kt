package at.wrk.tafel.admin.backend.database.model.push

import at.wrk.tafel.admin.backend.common.ExcludeFromTestCoverage
import at.wrk.tafel.admin.backend.database.model.auth.UserEntity
import at.wrk.tafel.admin.backend.database.model.base.BaseChangeTrackingEntity
import jakarta.persistence.Column
import jakarta.persistence.Entity
import jakarta.persistence.JoinColumn
import jakarta.persistence.ManyToOne
import jakarta.persistence.Table

@Entity(name = "PushSubscription")
@Table(name = "push_subscriptions")
@ExcludeFromTestCoverage
class PushSubscriptionEntity : BaseChangeTrackingEntity() {

    @ManyToOne
    @JoinColumn(name = "user_id", nullable = false)
    var user: UserEntity? = null

    @Column(name = "endpoint")
    var endpoint: String? = null

    @Column(name = "p256dh_key")
    var p256dhKey: String? = null

    @Column(name = "auth_key")
    var authKey: String? = null
}
