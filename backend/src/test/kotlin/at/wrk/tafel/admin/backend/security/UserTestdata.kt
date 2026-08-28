package at.wrk.tafel.admin.backend.security

import at.wrk.tafel.admin.backend.common.auth.model.TafelUser
import at.wrk.tafel.admin.backend.common.auth.model.UserPermissionItem
import at.wrk.tafel.admin.backend.common.auth.model.UserPermissions
import at.wrk.tafel.admin.backend.common.auth.model.UserRequest
import at.wrk.tafel.admin.backend.common.auth.model.UserResponse
import at.wrk.tafel.admin.backend.database.model.auth.UserAuthorityEntity
import at.wrk.tafel.admin.backend.database.model.auth.UserEntity
import at.wrk.tafel.admin.backend.database.model.base.EmployeeEntity
import org.springframework.security.core.authority.SimpleGrantedAuthority

val testUserPermissions = listOf(UserPermissions.CHECKIN, UserPermissions.USER_MANAGEMENT)

val testUserEntity = UserEntity(
    username = "test-username",
    // pwd: 12345
    password = "{argon2}\$argon2id\$v=19\$m=4096,t=3,p=1\$RXn6Xt/0q/Wtrvdns6NUnw\$X3xWUjENAbNSJNckeVFXWrjkoFSowwlu3xHx1/zb40w",
    employee = EmployeeEntity(
        personnelNumber = "test-personnelnumber",
        firstname = "test-firstname",
        lastname = "test-lastname",
    ).apply { id = 1 },
    enabled = true,
    passwordChangeRequired = false,
).apply {
    id = 0
    authorities = testUserPermissions.map { UserAuthorityEntity(user = this, name = it.key) }.toMutableList()
}

val testUser = TafelUser(
    id = testUserEntity.id!!,
    username = testUserEntity.username,
    password = null,
    enabled = true,
    personnelNumber = testUserEntity.employee.personnelNumber,
    firstname = testUserEntity.employee.firstname,
    lastname = testUserEntity.employee.lastname,
    authorities = testUserPermissions.map { SimpleGrantedAuthority(it.key) },
    passwordChangeRequired = false,
)

val testUserResponse = UserResponse(
    id = testUserEntity.id!!,
    username = testUserEntity.username,
    personnelNumber = testUserEntity.employee.personnelNumber,
    firstname = testUserEntity.employee.firstname,
    lastname = testUserEntity.employee.lastname,
    enabled = testUserEntity.enabled,
    passwordChangeRequired = testUserEntity.passwordChangeRequired,
    permissions = testUserPermissions.map {
        UserPermissionItem(key = it.key, title = it.title, category = it.category.title)
    },
)

val testUserRequest = UserRequest(
    id = testUserEntity.id!!,
    username = testUserEntity.username,
    personnelNumber = testUserEntity.employee.personnelNumber,
    firstname = testUserEntity.employee.firstname,
    lastname = testUserEntity.employee.lastname,
    enabled = testUserEntity.enabled,
    passwordChangeRequired = testUserEntity.passwordChangeRequired,
    permissions = testUserPermissions.map {
        UserPermissionItem(key = it.key, title = it.title, category = it.category.title)
    },
)
