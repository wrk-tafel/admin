package at.wrk.tafel.admin.backend.security

import at.wrk.tafel.admin.backend.database.entities.auth.UserEntity
import at.wrk.tafel.admin.backend.security.model.TafelUser

val testUserEntity = UserEntity().apply {
    username = "test-username"
    // pwd: 12345
    password =
        "{argon2}\$argon2id\$v=19\$m=4096,t=3,p=1\$RXn6Xt/0q/Wtrvdns6NUnw\$X3xWUjENAbNSJNckeVFXWrjkoFSowwlu3xHx1/zb40w"
    enabled = true
    id = 0
    personnelNumber = "test-personnelnumber"
    firstname = "test-firstname"
    lastname = "test-lastname"
    authorities = mutableListOf()
}

val testUser = TafelUser(
    username = testUserEntity.username!!,
    password = null,
    enabled = true,
    id = testUserEntity.id!!,
    personnelNumber = testUserEntity.personnelNumber!!,
    firstname = testUserEntity.firstname!!,
    lastname = testUserEntity.lastname!!,
    authorities = emptyList(),
    passwordChangeRequired = false
)
