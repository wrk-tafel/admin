package at.wrk.tafel.admin.backend.security

import at.wrk.tafel.admin.backend.common.auth.model.TafelUser
import at.wrk.tafel.admin.backend.common.auth.model.User
import at.wrk.tafel.admin.backend.database.entities.auth.UserAuthorityEntity
import at.wrk.tafel.admin.backend.database.entities.auth.UserEntity
import org.springframework.security.core.authority.SimpleGrantedAuthority

val testUserPermissions = listOf("TEST1", "TEST2")

val testUserEntity = UserEntity().apply {
    id = 0
    username = "test-username"
    // pwd: 12345
    password =
        "{argon2}\$argon2id\$v=19\$m=4096,t=3,p=1\$RXn6Xt/0q/Wtrvdns6NUnw\$X3xWUjENAbNSJNckeVFXWrjkoFSowwlu3xHx1/zb40w"
    enabled = true
    personnelNumber = "test-personnelnumber"
    firstname = "test-firstname"
    lastname = "test-lastname"
    authorities = testUserPermissions.map {
        val entity = UserAuthorityEntity()
        entity.user = this
        entity.name = it
        entity
    }.toMutableList()
    passwordChangeRequired = true
}

val testUser = TafelUser(
    id = testUserEntity.id!!,
    username = testUserEntity.username!!,
    password = null,
    enabled = true,
    personnelNumber = testUserEntity.personnelNumber!!,
    firstname = testUserEntity.firstname!!,
    lastname = testUserEntity.lastname!!,
    authorities = testUserPermissions.map { SimpleGrantedAuthority(it) },
    passwordChangeRequired = false
)

val testUserApiResponse = User(
    id = testUserEntity.id!!,
    username = testUserEntity.username!!,
    personnelNumber = testUserEntity.personnelNumber!!,
    firstname = testUserEntity.firstname!!,
    lastname = testUserEntity.lastname!!,
)
