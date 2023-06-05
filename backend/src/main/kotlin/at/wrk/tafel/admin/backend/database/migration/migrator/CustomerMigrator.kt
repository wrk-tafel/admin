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
        "Serbien" to "Serbien (exkl. Kosovo)",
        "staatenlos" to "Staatenlos",
        "Bosnien-Herzogowina" to "Bosnien und Herzegowina",
        "Aserbaidschan" to "Aserbeidschan",
        "Tibet" to "China",
        "Mazedonien" to "Republik Nordmazedonien",
        "Jugoslawien (alt)" to "Staatenlos",
        "_neues Land" to "Staatenlos",
        "USA" to "USA - Vereinigte Staaten",
        "Belarus" to "Belarus (Weissrussland)",
        "Tschechische Republik" to "Tschechien",
        "Latvia" to "Lettland"
    )

    val defaultDate = LocalDate.of(1900, 1, 1)

    var addPersId = 1000L

    fun migrate(oldConn: Connection, newConn: Connection): List<String> {
        val customers = readCustomers(oldConn, newConn)
        return customers
            .mapIndexed { index, user -> mapToNewCustomer(user, index) }
            .flatMap { generateInserts(it) }
    }

    private fun readCustomers(oldConn: Connection, newConn: Connection): List<Customer> {
        val customerList = mutableListOf<Customer>()

        val selectCustomersSql =
            "select * from kunden where kunden.kunr not in ('44a', '45a', '158a', '381a')" // skip invalid ids cause they are anyways very old
        val stmt = oldConn.createStatement()
        val result = stmt.executeQuery(selectCustomersSql)

        while (result.next()) {
            val dnr = result.getLong("dnr1")
            val kunr = result.getLong("kunr")
            val userId = getUserIdForDnr(newConn, dnr)
            var countryId: Long?

            val countryName = result.getString("nationale")?.trim()?.ifBlank { null }
            countryId = migrateCountryName(kunr, countryName, newConn)

            var incomeDue: LocalDate? = result.getDate("einkommen_bis")?.toLocalDate()
            if (incomeDue == null) {
                incomeDue = defaultDate
            }

            var birthDate: LocalDate? = result.getDate("geboren")?.toLocalDate()
            if (birthDate == null) {
                birthDate = defaultDate
            }

            val addPersons = readAddPersonsForKunr(oldConn, newConn, kunr)

            val customer = Customer(
                customerId = kunr,
                userId = userId,
                firstname = result.getString("vorname").trim().ifBlank { "unbekannt" },
                lastname = result.getString("zuname").trim().ifBlank { "unbekannt" },
                birthDate = birthDate!!,
                countryId = countryId,
                addressStreet = result.getString("adresse").trim().ifBlank { "unbekannt" },
                addressPostalCode = result.getString("plz")?.toInt(),
                addressCity = result.getString("ort").trim().ifBlank { "unbekannt" },
                telephoneNumber = result.getString("telefon").trim().ifBlank { null },
                email = result.getString("email").trim().ifBlank { null },
                employer = result.getString("arbeitgeber").trim().ifBlank { "unbekannt" },
                income = result.getBigDecimal("einkommen"),
                incomeDue = incomeDue!!,
                validUntil = result.getDate("gueltig_bis").toLocalDate(),
                additionalPersons = addPersons
            )
            customerList.add(customer)
        }

        result.close()
        stmt.close()
        return customerList
    }

    private fun migrateCountryName(
        kunr: Long,
        countryName: String?,
        newConn: Connection
    ): Long {
        var countryId: Long?
        if (countryName != null) {
            countryId = getCountryIdForName(newConn, countryName)
            if (countryId == null) {
                val replacement = COUNTRY_REMAPPING[countryName]
                if (replacement != null) {
                    countryId = getCountryIdForName(newConn, replacement)
                    if (countryId == null) {
                        println("COUNTRY REPLACEMENT '$replacement' NOT FOUND, record: $kunr")
                    }
                } else {
                    println("NO COUNTRY REPLACEMENT FOR '$countryName', record: $kunr")
                }
            }
        } else {
            countryId = getCountryIdForName(newConn, "Staatenlos")
        }
        return countryId!!
    }

    private fun readAddPersonsForKunr(conn: Connection, newConn: Connection, kunr: Long): List<CustomerAddPerson> {
        val persList = mutableListOf<CustomerAddPerson>()

        val sql = "select * from kunden_personen where kunr = '$kunr'"
        val stmt = conn.createStatement()
        val result = stmt.executeQuery(sql)

        while (result.next()) {
            var birthDate: LocalDate? = result.getDate("geboren")?.toLocalDate()
            if (birthDate == null) {
                birthDate = defaultDate
            }

            var incomeDue: LocalDate? = result.getDate("einkommen_vom")?.toLocalDate()
            if (incomeDue == null) {
                incomeDue = defaultDate
            }

            val countryName = result.getString("nationale")?.trim()?.ifBlank { null }
            val countryId = migrateCountryName(kunr, countryName, newConn)

            val person = CustomerAddPerson(
                customerId = kunr,
                firstname = result.getString("vorname"),
                lastname = result.getString("zuname"),
                birthDate = birthDate!!,
                employer = result.getString("arbeitgeber")?.trim()?.ifBlank { null },
                income = result.getBigDecimal("einkommen"),
                incomeDue = incomeDue!!,
                countryId = countryId
            )

            persList.add(person)
        }

        result.close()
        stmt.close()

        return persList
    }

    private fun getUserIdForDnr(conn: Connection, dnr: Long): Long? {
        val sql = "select id from users where username = '$dnr'"
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
        val sql = "select id from static_countries where name = '$name'"
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
            addressPostalCode = customer.addressPostalCode,
            addressCity = customer.addressCity,
            telephoneNumber = customer.telephoneNumber,
            email = customer.email,
            employer = customer.employer,
            income = customer.income,
            incomeDue = customer.incomeDue,
            validUntil = customer.validUntil,
            additionalPersons = customer.additionalPersons.mapIndexed { persIndex, pers ->
                CustomerNewAddPerson(
                    // TODO adapt id start
                    id = addPersId++,
                    customerId = pers.customerId,
                    firstname = pers.firstname,
                    lastname = pers.lastname,
                    birthDate = pers.birthDate,
                    employer = pers.employer,
                    income = pers.income,
                    incomeDue = pers.incomeDue,
                    countryId = pers.countryId
                )
            },
            migrated = true,
            migrationDate = LocalDateTime.now()
        )
    }

    private fun generateInserts(customer: CustomerNew): List<String> {
        val customerSql =
            """INSERT INTO customers (id, created_at, updated_at, customer_id, user_id, firstname, lastname, birth_date, country_id, address_street, address_postalcode, address_city, telephone_number, email, employer, income, income_due, valid_until, migrated, migration_date)
                VALUES (${customer.id},
                '${customer.createdAt.format(DateTimeFormatter.ISO_DATE_TIME)}',
                '${customer.updatedAt.format(DateTimeFormatter.ISO_DATE_TIME)}',
                ${customer.customerId},
                ${customer.userId},
                '${customer.firstname}',
                '${customer.lastname}',
                '${customer.birthDate.format(DateTimeFormatter.ISO_DATE)}',
                ${customer.countryId},
                '${customer.addressStreet}',
                ${if (customer.addressPostalCode != null) "'" + customer.addressPostalCode + "'" else "null"},
                ${if (customer.addressCity != null) "'" + customer.addressCity + "'" else "null"},
                ${if (customer.telephoneNumber != null) "'" + customer.telephoneNumber + "'" else "null"},
                ${if (customer.email != null) "'" + customer.email + "'" else "null"},
                ${if (customer.employer != null) "'" + customer.employer + "'" else "null"},
                ${customer.income},
                '${customer.incomeDue.format(DateTimeFormatter.ISO_DATE)}',
                '${customer.validUntil.format(DateTimeFormatter.ISO_DATE)}',
                ${customer.migrated},
                '${customer.migrationDate.format(DateTimeFormatter.ISO_DATE_TIME)}'
                );
            """.trimIndent()

        val persInserts = customer.additionalPersons.map {
            """
                INSERT INTO customers_addpersons (id, created_at, updated_at, customer_id, firstname, lastname, birth_date, income, income_due, country_id, employer)
                VALUES (
                ${it.id},
                NOW(),
                NOW(),
                ${it.customerId},
                '${it.firstname}',
                '${it.lastname}',
                '${it.birthDate.format(DateTimeFormatter.ISO_DATE)}',
                ${it.income},
                '${it.incomeDue.format(DateTimeFormatter.ISO_DATE)}',
                ${it.countryId},
                ${if (it.employer != null) "'" + it.employer.replace("'", "''") + "'" else "null"}
                );
            """.trimIndent()
        }

        return listOf(customerSql) + persInserts
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
    val addressPostalCode: Int?,
    val addressCity: String?,
    val telephoneNumber: String?,
    val email: String?,
    val employer: String,
    val income: BigDecimal,
    val incomeDue: LocalDate,
    val validUntil: LocalDate,
    val additionalPersons: List<CustomerAddPerson>
)

data class CustomerAddPerson(
    val customerId: Long,
    val firstname: String,
    val lastname: String,
    val birthDate: LocalDate,
    val employer: String?,
    val income: BigDecimal,
    val incomeDue: LocalDate,
    val countryId: Long
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
    val addressPostalCode: Int?,
    val addressCity: String?,
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
    val id: Long,
    val customerId: Long,
    val firstname: String,
    val lastname: String,
    val birthDate: LocalDate,
    val employer: String?,
    val income: BigDecimal,
    val incomeDue: LocalDate,
    val countryId: Long
)
