package at.wrk.tafel.admin.backend.database.migration

import at.wrk.tafel.admin.backend.database.migration.migrator.UserMigrator
import java.sql.DriverManager

/**
 * Basic script to read the old database, migrate the data and write new sql's for the new database structure
 */
fun main() {
    val newConn = DriverManager.getConnection("jdbc:postgresql://localhost:5432/tafeladmin", "tafeladmin", "admin")
    val oldConn = DriverManager.getConnection("jdbc:postgresql://localhost:5432/tafeladmin_old", "tafeladmin", "admin")

    val userStatements = UserMigrator().migrate(newConn, oldConn)
    userStatements.forEach { println(it) }

    oldConn.close()
    newConn.close()
}
