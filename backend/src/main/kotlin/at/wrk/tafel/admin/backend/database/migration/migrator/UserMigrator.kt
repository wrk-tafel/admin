package at.wrk.tafel.admin.backend.database.migration.migrator

import at.wrk.tafel.admin.backend.common.ExcludeFromTestCoverage
import org.springframework.security.crypto.argon2.Argon2PasswordEncoder
import java.sql.Connection
import java.time.LocalDateTime
import java.time.format.DateTimeFormatter
import kotlin.random.Random

@ExcludeFromTestCoverage
class UserMigrator {

    fun migrate(conn: Connection): List<String> {
        val users = readUsers(conn)
        return users
            .mapIndexed { index, user -> mapToNewUser(user, index) }
            .flatMap { generateInserts(it) }
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

    private fun mapToNewUser(user: User, index: Int): UserNew {
        val argon2PasswordEncoder = Argon2PasswordEncoder(16, 32, 1, 16384, 2)

        var password = user.password?.trim()?.ifBlank { null }
        if (password == null) {
            val charPool: List<Char> = ('a'..'z') + ('A'..'Z') + ('0'..'9')
            password = (1..10)
                .map { Random.nextInt(0, charPool.size).let { charPool[it] } }
                .joinToString("")

            println("Generated password for ${user.personnelNumber} ${user.firstname} ${user.lastname} - $password")
        }

        return UserNew(
            // TODO adapt id start
            id = 600 + index.toLong(),
            createdAt = LocalDateTime.now(),
            updatedAt = LocalDateTime.now(),
            username = user.personnelNumber.toString(),
            password = "{argon2}" + argon2PasswordEncoder.encode(password),
            enabled = user.active,
            personnelNumber = user.personnelNumber,
            firstname = user.firstname,
            lastname = user.lastname,
            passwordChangeRequired = true,
            migrated = true,
            migrationDate = LocalDateTime.now()
        )
    }

    private fun generateInserts(user: UserNew): List<String> {
        val userSql =
            """INSERT INTO users (id, created_at, updated_at, username, password, enabled, personnel_number, firstname, lastname, passwordchange_required, migrated, migration_date)
                VALUES (${user.id}, '${user.createdAt.format(DateTimeFormatter.ISO_DATE_TIME)}',
                '${user.updatedAt.format(DateTimeFormatter.ISO_DATE_TIME)}',
                '${user.username}', '${user.password}', ${user.enabled}, '${user.personnelNumber}', '${user.firstname}', '${user.lastname}', ${user.passwordChangeRequired}, ${user.migrated},
                '${user.migrationDate.format(DateTimeFormatter.ISO_DATE_TIME)}');
            """.trimIndent()
        val authoritiesSql = """INSERT INTO users_authorities (id, created_at, updated_at, user_id, name)
                VALUES (${5000 + user.id},
                '${user.createdAt.format(DateTimeFormatter.ISO_DATE_TIME)}',
                '${user.updatedAt.format(DateTimeFormatter.ISO_DATE_TIME)}',
                ${user.id}, 'DASHBOARD');
            """.trimIndent()

        return listOf(userSql, authoritiesSql)
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
    val id: Long,
    val createdAt: LocalDateTime,
    val updatedAt: LocalDateTime,
    val username: String,
    val password: String,
    val enabled: Boolean,
    val personnelNumber: Long,
    val firstname: String,
    val lastname: String,
    val passwordChangeRequired: Boolean,
    val migrated: Boolean,
    val migrationDate: LocalDateTime
)
