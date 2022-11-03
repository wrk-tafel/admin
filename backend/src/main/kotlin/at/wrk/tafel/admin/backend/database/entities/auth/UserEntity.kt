package at.wrk.tafel.admin.backend.database.entities.auth

import at.wrk.tafel.admin.backend.database.entities.base.BaseChangeTrackingEntity
import javax.persistence.*

@Entity(name = "User")
@Table(name = "users")
class UserEntity : BaseChangeTrackingEntity() {
    @Column(name = "username")
    var username: String? = null

    @Column(name = "password")
    var password: String? = null

    @Column(name = "enabled")
    var enabled: Boolean? = false

    @Column(name = "personnel_number")
    var personnelNumber: String? = null

    @Column(name = "firstname")
    var firstname: String? = null

    @Column(name = "lastname")
    var lastname: String? = null

    @Column(name = "passwordchange_required")
    var passwordChangeRequired: Boolean? = null

    @OneToMany(mappedBy = "user", cascade = [CascadeType.ALL], orphanRemoval = true, fetch = FetchType.EAGER)
    var authorities: MutableList<UserAuthorityEntity> = mutableListOf()

}
