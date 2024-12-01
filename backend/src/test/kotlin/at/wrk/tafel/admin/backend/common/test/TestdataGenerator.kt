package at.wrk.tafel.admin.backend.common.test

import at.wrk.tafel.admin.backend.database.model.auth.UserEntity
import at.wrk.tafel.admin.backend.database.model.base.EmployeeEntity
import at.wrk.tafel.admin.backend.database.model.base.Gender
import at.wrk.tafel.admin.backend.database.model.customer.CustomerEntity
import at.wrk.tafel.admin.backend.database.model.distribution.DistributionEntity
import at.wrk.tafel.admin.backend.database.model.staticdata.CountryEntity
import java.math.BigDecimal
import java.time.LocalDate
import java.time.LocalDateTime
import kotlin.random.Random

object TestdataGenerator {

    fun generateRandomLong(): Long {
        return Random.nextLong(0, 9999999999999)
    }

    fun createUser(): UserEntity {
        val randomNumber = generateRandomLong()

        val user = UserEntity()
        user.username = "testuser-$randomNumber"
        user.employee = EmployeeEntity().apply {
            personnelNumber = randomNumber.toString()
            firstname = "firstname-$randomNumber"
            lastname = "lastname-$randomNumber"
        }
        user.enabled = true
        user.password = "dummy"
        user.passwordChangeRequired = false

        return user
    }

    fun createDistribution(user: UserEntity): DistributionEntity {
        val distribution = DistributionEntity()

        distribution.startedAt = LocalDateTime.now()
        distribution.startedByUser = user

        return distribution
    }

    fun createCustomer(issuer: EmployeeEntity, country: CountryEntity): CustomerEntity {
        val randomNumber = generateRandomLong()

        val customer = CustomerEntity()

        customer.customerId = generateRandomLong()
        customer.issuer = issuer
        customer.lastname = "lastname-$randomNumber"
        customer.firstname = "firstname-$randomNumber"
        customer.birthDate = LocalDate.now().minusYears(30)
        customer.gender = Gender.MALE
        customer.country = country
        customer.addressStreet = "street-$randomNumber"
        customer.addressHouseNumber = "${randomNumber}A"
        customer.addressStairway = "$randomNumber"
        customer.addressDoor = "$randomNumber"
        customer.addressPostalCode = Random.nextInt()
        customer.addressCity = "city-$randomNumber"
        customer.telephoneNumber = "telephoneNumber-$randomNumber"
        customer.email = "email-$randomNumber"
        customer.employer = "employer-$randomNumber"
        customer.income = BigDecimal("500")
        customer.incomeDue = LocalDate.now().plusYears(1)
        customer.prolongedAt = null
        customer.validUntil = LocalDate.now().plusYears(1)

        customer.locked = false
        customer.lockedAt = null
        customer.lockedBy = null
        customer.lockReason = null

        customer.migrated = false

        return customer
    }

    fun createCountry(): CountryEntity {
        val randomNumber = generateRandomLong()

        val country = CountryEntity()

        country.code = "00"
        country.name = "Country-$randomNumber"

        return country
    }

}
