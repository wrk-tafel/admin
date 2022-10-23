package at.wrk.tafel.admin.backend.security

import at.wrk.tafel.admin.backend.database.entities.auth.UserEntity
import at.wrk.tafel.admin.backend.security.model.TafelUser

val testUserEntity = UserEntity().apply {
    username = "test-username"
    password = "test-password"
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
    authorities = emptyList()
)
