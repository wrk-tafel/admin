package at.wrk.tafel.admin.backend.database.migration.migrator

import at.wrk.tafel.admin.backend.common.ExcludeFromTestCoverage
import org.springframework.security.crypto.argon2.Argon2PasswordEncoder
import java.sql.Connection
import java.time.LocalDateTime
import java.time.format.DateTimeFormatter
import kotlin.random.Random

@ExcludeFromTestCoverage
class UserMigrator {

    fun migrate(oldConn: Connection, newConn: Connection): List<String> {
        val users = readUsers(oldConn)
        return users
            .map { user -> mapToNewUser(user) }
            .flatMap { generateInserts(it, newConn) }
    }

    private fun readUsers(
        conn: Connection
    ): List<User> {
        val userList = mutableListOf<User>()

        val selectUsersSql = "select dnr, aktiv, vorname, zuname, kennwort from mitarbeiter"
        val stmt = conn.createStatement()
        val result = stmt.executeQuery(selectUsersSql)

        while (result.next()) {
            val user = User(
                personnelNumber = result.getLong("dnr"),
                firstname = result.getString("vorname").trim().ifBlank { "unbekannt" },
                lastname = result.getString("zuname").trim().ifBlank { "unbekannt" },
                active = result.getString("aktiv").trim() == "J",
                password = result.getString("kennwort").trim().ifBlank { null }
            )
            userList.add(user)
        }

        result.close()
        stmt.close()
        return userList
    }

    private fun mapToNewUser(user: User): UserNew {
        val argon2PasswordEncoder = Argon2PasswordEncoder(16, 32, 1, 16384, 2)

        var password = user.password?.trim()?.ifBlank { null }
        var generatedPassword: String? = null
        if (password == null) {
            val charPool: List<Char> = ('a'..'z') + ('A'..'Z') + ('0'..'9')
            generatedPassword = (1..15)
                .map { Random.nextInt(0, charPool.size).let { charPool[it] } }
                .joinToString("")
        }

        return UserNew(
            createdAt = LocalDateTime.now(),
            updatedAt = LocalDateTime.now(),
            username = user.personnelNumber.toString(),
            generatedPasswordValue = generatedPassword,
            passwordHash = "{argon2}" + argon2PasswordEncoder.encode(password ?: generatedPassword!!),
            enabled = user.active,
            personnelNumber = user.personnelNumber,
            firstname = user.firstname,
            lastname = user.lastname,
            passwordChangeRequired = true,
            migrated = true,
            migrationDate = LocalDateTime.now()
        )
    }

    private fun generateInserts(user: UserNew, conn: Connection): List<String> {
        val newUserId = getIdFromSequence(conn)
        val newAuthorityId = getIdFromSequence(conn)

        val pwdComment = "-- generated pwd: ${user.generatedPasswordValue}"
        val userSql =
            """INSERT INTO users (id, created_at, updated_at, username, password, enabled, personnel_number, firstname, lastname, passwordchange_required, migrated, migration_date)
                VALUES ($newUserId, '${user.createdAt.format(DateTimeFormatter.ISO_DATE_TIME)}',
                '${user.updatedAt.format(DateTimeFormatter.ISO_DATE_TIME)}',
                '${user.username}', '${user.passwordHash}', ${user.enabled}, '${user.personnelNumber}', '${user.firstname}', '${user.lastname}', ${user.passwordChangeRequired}, ${user.migrated},
                '${user.migrationDate.format(DateTimeFormatter.ISO_DATE_TIME)}');
            """.trimIndent()
        val authoritiesSql = """INSERT INTO users_authorities (id, created_at, updated_at, user_id, name)
                VALUES ($newAuthorityId,
                '${user.createdAt.format(DateTimeFormatter.ISO_DATE_TIME)}',
                '${user.updatedAt.format(DateTimeFormatter.ISO_DATE_TIME)}',
                $newUserId, 'DASHBOARD');
            """.trimIndent()

        return listOf(pwdComment, userSql, authoritiesSql)
    }

    private fun getIdFromSequence(conn: Connection): Long {
        val sql = "select nextval('hibernate_sequence') as id"
        val stmt = conn.createStatement()
        val result = stmt.executeQuery(sql)

        var newId: Long? = null
        if (result.next()) {
            newId = result.getLong("id")
        }
        result.close()
        stmt.close()

        return newId!!
    }

}

@ExcludeFromTestCoverage
data class User(
    val personnelNumber: Long,
    val firstname: String,
    val lastname: String,
    val active: Boolean,
    val password: String?
)

@ExcludeFromTestCoverage
data class UserNew(
    val createdAt: LocalDateTime,
    val updatedAt: LocalDateTime,
    val username: String,
    val generatedPasswordValue: String?,
    val passwordHash: String,
    val enabled: Boolean,
    val personnelNumber: Long,
    val firstname: String,
    val lastname: String,
    val passwordChangeRequired: Boolean,
    val migrated: Boolean,
    val migrationDate: LocalDateTime
)
