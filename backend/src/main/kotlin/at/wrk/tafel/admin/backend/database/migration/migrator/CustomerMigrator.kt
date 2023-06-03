package at.wrk.tafel.admin.backend.database.migration.migrator

import java.math.BigDecimal
import java.sql.Connection
import java.time.LocalDate
import java.time.LocalDateTime

class CustomerMigrator {

    fun migrate(conn: Connection): List<String> {
        val customers = readCustomers(conn)
        return customers
            .mapIndexed { index, user -> mapToNewCustomer(user, index) }
            .flatMap { generateInserts(it) }
    }

    private fun readCustomers(conn: Connection): List<Customer> {
        val customerList = mutableListOf<Customer>()

        val selectUsersSql = "select *  from kunden"
        val stmt = conn.createStatement()
        val result = stmt.executeQuery(selectUsersSql)

        while (result.next()) {
            // TODO
            /*
            val customer = Customer(
                firstname = result.getString("vorname").trim().ifBlank { null },
                lastname = result.getString("zuname").trim().ifBlank { null },
            )
            customerList.add(customer)
             */
        }

        result.close()
        stmt.close()
        return customerList
    }

    private fun mapToNewCustomer(customer: Customer, index: Int): CustomerNew? {
        // TODO
        return null
    }

    private fun generateInserts(customer: CustomerNew?): List<String> {
        // TODO
        return emptyList()
    }

}

data class Customer(
    val customerId: Long,
    val userId: Long?,
    val firstname: String,
    val lastname: String,
    val birthDate: LocalDate,
    val countryId: Long,
    val addressStreet: String,
    val addressHouseNumber: String,
    val addressStairway: String,
    val addressPostalCode: Int,
    val addressDoor: String,
    val addressCity: String,
    val telephoneNumber: String,
    val email: String,
    val employer: String,
    val income: BigDecimal,
    val incomeDue: LocalDate,
    val validUntil: LocalDate,
)

data class CustomerNew(
    val id: Long,
    val createdAt: LocalDateTime,
    val updatedAt: LocalDateTime,
    val customerId: Long,
    val userId: Long?,
    val firstname: String,
    val lastname: String,
    val birthDate: LocalDate,
    val countryId: Long,
    val addressStreet: String,
    val addressHouseNumber: String,
    val addressStairway: String,
    val addressPostalCode: Int,
    val addressDoor: String,
    val addressCity: String,
    val telephoneNumber: String,
    val email: String,
    val employer: String,
    val income: BigDecimal,
    val incomeDue: LocalDate,
    val validUntil: LocalDate,
    val additionalPersons: List<CustomerNewAddPerson>
)

data class CustomerNewAddPerson(
    val customerId: Long,
    val firstname: String,
    val lastname: String,
    val birthDate: LocalDate,
    val employer: String,
    val income: BigDecimal,
    val incomeDue: LocalDate,
    val countryId: Long
)
