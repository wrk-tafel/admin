package at.wrk.tafel.admin.backend.database.entities.auth

import at.wrk.tafel.admin.backend.database.entities.base.BaseChangeTrackingEntity
import javax.persistence.*

@Entity(name = "UserAuthority")
@Table(name = "users_authorities")
class UserAuthorityEntity : BaseChangeTrackingEntity() {

    @ManyToOne
    @JoinColumn(name = "user_id", nullable = false)
    var user: UserEntity? = null

    @Column(name = "name")
    var name: String? = null

}
