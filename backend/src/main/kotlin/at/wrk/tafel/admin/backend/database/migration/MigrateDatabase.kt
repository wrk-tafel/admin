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
    executeStatements(newConn, userStatements)

    val customerStatements = CustomerMigrator().migrate(oldConn, newConn)
    executeStatements(newConn, customerStatements)

    oldConn.close()
    newConn.close()
}

fun executeStatements(conn: Connection, sqlStatements: List<String>) {
    val stmt = conn.createStatement()
    println("Executing statements to database ...")
    sqlStatements.forEach {
        println(it)
        stmt.execute(it)
    }
    println("Executing statements to database ... Finished")
    stmt.close()
}
