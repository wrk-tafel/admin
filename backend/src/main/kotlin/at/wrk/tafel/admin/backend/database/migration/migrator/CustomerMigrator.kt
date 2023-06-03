package at.wrk.tafel.admin.backend.database.migration.migrator

import java.math.BigDecimal
import java.sql.Connection
import java.time.LocalDate
import java.time.LocalDateTime
import java.time.format.DateTimeFormatter

class CustomerMigrator {

    val COUNTRY_REMAPPING = mapOf(
        "Tschetschenien" to "Russische Föderation",
        "Russ.Föderation" to "Russische Föderation",
        "Russland" to "Russische Föderation",
        "Serbien" to "Serbien (exkl. Kosovo)"
    )

    fun migrate(oldConn: Connection, newConn: Connection): List<String> {
        val customers = readCustomers(oldConn, newConn)
        return customers
            .mapIndexed { index, user -> mapToNewCustomer(user, index) }
            .flatMap { generateInserts(it) }
    }

    private fun readCustomers(oldConn: Connection, newConn: Connection): List<Customer> {
        val customerList = mutableListOf<Customer>()

        val selectCustomersSql = "select * from kunden"
        val stmt = oldConn.createStatement()
        val result = stmt.executeQuery(selectCustomersSql)

        val defaultDate = LocalDate.of(1900, 1, 1)

        while (result.next()) {
            val dnr = result.getLong("dnr1")
            val userId = getUserIdForDnr(newConn, dnr)
            var countryId: Long?

            val countryName = result.getString("nationale")?.trim()?.ifBlank { null }
            if (countryName != null) {
                countryId = getCountryIdForName(newConn, countryName)
                if (countryId == null) {
                    val replacement = COUNTRY_REMAPPING[countryName]
                    if (replacement != null) {
                        countryId = getCountryIdForName(newConn, replacement)
                        if (countryId == null) {
                            println("COUNTRY REPLACEMENT '$replacement' NOT FOUND, record: ${result.getLong("kunr")}")
                        }
                    } else {
                        println("NO COUNTRY REPLACEMENT FOR '$countryName', record: ${result.getLong("kunr")}")
                    }
                }
            } else {
                countryId = getCountryIdForName(newConn, "Staatenlos")
            }

            var incomeDue: LocalDate? = result.getDate("einkommen_bis")?.toLocalDate()
            if (incomeDue == null) {
                incomeDue = defaultDate
            }

            val customer = Customer(
                customerId = result.getLong("kunr"),
                userId = userId,
                firstname = result.getString("vorname").trim().ifBlank { "unbekannt" },
                lastname = result.getString("zuname").trim().ifBlank { "unbekannt" },
                birthDate = result.getDate("geboren").toLocalDate(),
                countryId = countryId!!,
                addressStreet = result.getString("adresse").trim().ifBlank { "unbekannt" },
                addressHouseNumber = result.getString("adresse").trim().ifBlank { "unbekannt" },
                addressStairway = result.getString("adresse").trim().ifBlank { "unbekannt" },
                addressPostalCode = result.getString("plz").toInt(),
                addressDoor = null,
                addressCity = result.getString("ort").trim().ifBlank { "unbekannt" },
                telephoneNumber = result.getString("telefon").trim().ifBlank { null },
                email = result.getString("email").trim().ifBlank { null },
                employer = result.getString("arbeitgeber").trim().ifBlank { "unbekannt" },
                income = result.getBigDecimal("einkommen"),
                incomeDue = incomeDue!!,
                validUntil = result.getDate("gueltig_bis").toLocalDate()
            )
            customerList.add(customer)
        }

        result.close()
        stmt.close()
        return customerList
    }

    private fun getUserIdForDnr(conn: Connection, dnr: Long): Long? {
        val sql = "select id from users where users.username = '$dnr'"
        val stmt = conn.createStatement()
        val result = stmt.executeQuery(sql)

        var userId: Long? = null
        if (result.next()) {
            userId = result.getLong("id")
        }
        result.close()
        stmt.close()

        return userId
    }

    private fun getCountryIdForName(conn: Connection, name: String): Long? {
        val sql = "select id from static_countries where static_countries.name = '$name'"
        val stmt = conn.createStatement()
        val result = stmt.executeQuery(sql)

        var userId: Long? = null
        if (result.next()) {
            userId = result.getLong("id")
        }
        result.close()
        stmt.close()

        return userId
    }

    private fun mapToNewCustomer(customer: Customer, index: Int): CustomerNew {
        return CustomerNew(
            // TODO adapt id start
            id = 1000 + index.toLong(),
            createdAt = LocalDateTime.now(),
            updatedAt = LocalDateTime.now(),
            customerId = customer.customerId,
            userId = customer.userId,
            firstname = customer.firstname,
            lastname = customer.lastname,
            birthDate = customer.birthDate,
            countryId = customer.countryId,
            addressStreet = customer.addressStreet,
            addressHouseNumber = customer.addressHouseNumber,
            addressStairway = customer.addressStairway,
            addressPostalCode = customer.addressPostalCode,
            addressDoor = customer.addressDoor,
            addressCity = customer.addressCity,
            telephoneNumber = customer.telephoneNumber,
            email = customer.email,
            employer = customer.employer,
            income = customer.income,
            incomeDue = customer.incomeDue,
            validUntil = customer.validUntil,
            additionalPersons = emptyList(), // TODO
            migrated = true,
            migrationDate = LocalDateTime.now()
        )
    }

    private fun generateInserts(customer: CustomerNew): List<String> {
        val customerSql =
            """INSERT INTO customers (id, created_at, updated_at, customer_id, user_id, firstname, lastname, birth_date, country_id, address_street, address_housenumber, address_stairway, address_postalcode, address_city, address_door, telephone_number, email, employer, income, income_due, valid_until, migrated, migration_date)
                VALUES (${customer.id}, ${customer.createdAt.format(DateTimeFormatter.ISO_DATE_TIME)}, ${
                customer.updatedAt.format(
                    DateTimeFormatter.ISO_DATE_TIME
                )
            },
                ${customer.customerId}, ${customer.userId}, ${customer.firstname}, ${customer.lastname},
                ${customer.birthDate.format(DateTimeFormatter.ISO_DATE_TIME)}, ${customer.countryId}, ${customer.addressStreet},
                ${customer.addressHouseNumber}, ${customer.addressStairway}, ${customer.addressPostalCode},
                ${customer.addressCity}, ${customer.addressDoor}, ${customer.telephoneNumber},
                ${customer.email}, ${customer.employer}, ${customer.income}, ${
                customer.incomeDue.format(
                    DateTimeFormatter.ISO_DATE_TIME
                )
            },
                ${customer.validUntil.format(DateTimeFormatter.ISO_DATE_TIME)}, ${customer.migrated}, ${
                customer.migrationDate.format(
                    DateTimeFormatter.ISO_DATE_TIME
                )
            });
            """.trimIndent()

        return listOf(customerSql)
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
    val addressStairway: String?,
    val addressPostalCode: Int,
    val addressDoor: String?,
    val addressCity: String,
    val telephoneNumber: String?,
    val email: String?,
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
    val addressStairway: String?,
    val addressPostalCode: Int,
    val addressDoor: String?,
    val addressCity: String,
    val telephoneNumber: String?,
    val email: String?,
    val employer: String,
    val income: BigDecimal,
    val incomeDue: LocalDate,
    val validUntil: LocalDate,
    val additionalPersons: List<CustomerNewAddPerson>,
    val migrated: Boolean,
    val migrationDate: LocalDateTime
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
