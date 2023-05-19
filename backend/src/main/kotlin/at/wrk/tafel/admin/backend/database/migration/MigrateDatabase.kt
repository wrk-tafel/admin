package at.wrk.tafel.admin.backend.database.migration

import at.wrk.tafel.admin.backend.database.migration.migrator.CustomerMigrator
import at.wrk.tafel.admin.backend.database.migration.migrator.UserMigrator
import java.sql.Connection
import java.sql.DriverManager

/**
 * Basic script to read the old database, migrate the data and write new sql's for the new database structure
 */
fun main() {
    val newConn = DriverManager.getConnection("jdbc:postgresql://localhost:5432/tafeladmin", "tafeladmin", "admin")
    val oldConn = DriverManager.getConnection("jdbc:mysql://localhost:3306/tafel", "root", "admin")

    val userStatements = UserMigrator().migrate(oldConn)
    val customerStatements = CustomerMigrator().migrate(oldConn)

    val statements = userStatements + customerStatements
    statements.forEach { println(it) }

    val executeToDb = true
    if (executeToDb) {
        executeStatements(newConn, statements)
    }

    oldConn.close()
    newConn.close()
}

fun executeStatements(conn: Connection, sqlStatements: List<String>) {
    val stmt = conn.createStatement()
    sqlStatements.forEach { stmt.addBatch(it) }
    stmt.executeBatch()
    stmt.close()
}
