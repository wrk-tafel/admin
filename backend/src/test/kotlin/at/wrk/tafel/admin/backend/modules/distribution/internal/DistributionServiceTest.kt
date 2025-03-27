package at.wrk.tafel.admin.backend.modules.distribution.internal

import at.wrk.tafel.admin.backend.common.auth.model.TafelJwtAuthentication
import at.wrk.tafel.admin.backend.common.pdf.PDFService
import at.wrk.tafel.admin.backend.database.model.auth.UserRepository
import at.wrk.tafel.admin.backend.database.model.customer.CustomerAddPersonEntity
import at.wrk.tafel.admin.backend.database.model.customer.CustomerEntity
import at.wrk.tafel.admin.backend.database.model.customer.CustomerRepository
import at.wrk.tafel.admin.backend.database.model.distribution.DistributionCustomerEntity
import at.wrk.tafel.admin.backend.database.model.distribution.DistributionCustomerRepository
import at.wrk.tafel.admin.backend.database.model.distribution.DistributionEntity
import at.wrk.tafel.admin.backend.database.model.distribution.DistributionRepository
import at.wrk.tafel.admin.backend.database.model.distribution.DistributionStatisticEntity
import at.wrk.tafel.admin.backend.database.model.logistics.ShelterRepository
import at.wrk.tafel.admin.backend.modules.base.country.testCountry1
import at.wrk.tafel.admin.backend.modules.base.exception.TafelValidationException
import at.wrk.tafel.admin.backend.modules.distribution.internal.model.CustomerListItem
import at.wrk.tafel.admin.backend.modules.distribution.internal.model.CustomerListPdfModel
import at.wrk.tafel.admin.backend.modules.logistics.testShelter1
import at.wrk.tafel.admin.backend.modules.logistics.testShelter2
import at.wrk.tafel.admin.backend.security.testUser
import at.wrk.tafel.admin.backend.security.testUserEntity
import at.wrk.tafel.admin.backend.security.testUserPermissions
import io.mockk.every
import io.mockk.impl.annotations.InjectMockKs
import io.mockk.impl.annotations.RelaxedMockK
import io.mockk.impl.annotations.SpyK
import io.mockk.junit5.MockKExtension
import io.mockk.mockk
import io.mockk.slot
import io.mockk.verify
import org.assertj.core.api.Assertions.assertThat
import org.junit.jupiter.api.AfterEach
import org.junit.jupiter.api.Assertions.assertThrows
import org.junit.jupiter.api.BeforeEach
import org.junit.jupiter.api.Disabled
import org.junit.jupiter.api.Test
import org.junit.jupiter.api.assertThrows
import org.junit.jupiter.api.extension.ExtendWith
import org.springframework.security.core.authority.SimpleGrantedAuthority
import org.springframework.security.core.context.SecurityContextHolder
import org.springframework.security.core.context.SecurityContextImpl
import org.springframework.transaction.support.TransactionTemplate
import java.math.BigDecimal
import java.time.LocalDate
import java.time.LocalDateTime
import java.time.format.DateTimeFormatter

@ExtendWith(MockKExtension::class)
internal class DistributionServiceTest {

    @RelaxedMockK
    private lateinit var distributionRepository: DistributionRepository

    @RelaxedMockK
    private lateinit var userRepository: UserRepository

    @RelaxedMockK
    private lateinit var distributionCustomerRepository: DistributionCustomerRepository

    @RelaxedMockK
    private lateinit var customerRepository: CustomerRepository

    @RelaxedMockK
    private lateinit var pdfService: PDFService

    @RelaxedMockK
    private lateinit var distributionPostProcessorService: DistributionPostProcessorService

    @SpyK
    private var transactionTemplate: TransactionTemplate = TransactionTemplate(mockk(relaxed = true))

    @RelaxedMockK
    private lateinit var shelterRepository: ShelterRepository

    @InjectMockKs
    private lateinit var service: DistributionService

    private val authentication = TafelJwtAuthentication(
        tokenValue = "TOKEN",
        username = testUser.username,
        fullName = "", // TODO FULLNAME
        authorities = testUserPermissions.map { SimpleGrantedAuthority(it.key) }
    )

    private lateinit var testCustomerEntity1: CustomerEntity
    private lateinit var testCustomerEntity2: CustomerEntity

    @BeforeEach
    fun beforeEach() {
        SecurityContextHolder.setContext(SecurityContextImpl(authentication))

        testCustomerEntity1 = CustomerEntity().apply {
            id = 1
            issuer = testUserEntity.employee
            createdAt = LocalDateTime.now()
            customerId = 100
            lastname = "Mustermann"
            firstname = "Max"
            birthDate = LocalDate.now().minusYears(30)
            country = testCountry1
            addressStreet = "Test-Straße"
            addressHouseNumber = "100"
            addressStairway = "1"
            addressPostalCode = 1010
            addressDoor = "21"
            addressCity = "Wien"
            telephoneNumber = "0043660123123"
            email = "test@mail.com"
            employer = "Employer 123"
            income = BigDecimal("1000")
            incomeDue = LocalDate.now()
            validUntil = LocalDate.now()
            locked = false

            val addPerson1 = CustomerAddPersonEntity()
            addPerson1.id = 2
            addPerson1.lastname = "Add pers 1"
            addPerson1.firstname = "Add pers 1"
            addPerson1.birthDate = LocalDate.now().minusYears(5)
            addPerson1.income = BigDecimal("100")
            addPerson1.incomeDue = LocalDate.now()
            addPerson1.country = testCountry1
            addPerson1.excludeFromHousehold = false

            val addPerson2 = CustomerAddPersonEntity()
            addPerson2.id = 3
            addPerson2.lastname = "Add pers 2"
            addPerson2.firstname = "Add pers 2"
            addPerson2.birthDate = LocalDate.now().minusYears(2)
            addPerson2.country = testCountry1
            addPerson2.excludeFromHousehold = true

            additionalPersons = mutableListOf(addPerson1, addPerson2)
        }

        testCustomerEntity2 = CustomerEntity().apply {
            id = 2
            createdAt = LocalDateTime.now()
            customerId = 200
            lastname = "Mustermann"
            firstname = "Max 2"
            birthDate = LocalDate.now().minusYears(22)
            country = testCountry1
            addressStreet = "Test-Straße 2"
            addressHouseNumber = "200"
            addressStairway = "1-2"
            addressPostalCode = 1010
            addressDoor = "21-2"
            addressCity = "Wien 2"
            telephoneNumber = "0043660123123"
            email = "test2@mail.com"
            employer = "Employer 123-2"
            income = BigDecimal("2000")
            incomeDue = LocalDate.now()
            validUntil = LocalDate.now()
            locked = false
        }

        every { userRepository.findByUsername(authentication.username!!) } returns testUserEntity
    }

    @AfterEach
    fun afterEach() {
        SecurityContextHolder.clearContext()
    }

    @Test
    fun `create new distribution`() {
        every { userRepository.findByUsername(authentication.username!!) } returns testUserEntity
        every { distributionRepository.getCurrentDistribution() } returns null

        val distributionEntity = DistributionEntity()
        distributionEntity.id = 123
        every { distributionRepository.save(any()) } returns distributionEntity

        val distribution = service.createNewDistribution()

        assertThat(distribution).isEqualTo(distributionEntity)

        verify {
            distributionRepository.save(withArg {
                assertThat(it.startedAt).isBetween(LocalDateTime.now().minusSeconds(1), LocalDateTime.now())
                assertThat(it.endedAt).isNull()
                assertThat(it.startedByUser).isEqualTo(testUserEntity)
            })
        }
    }

    @Test
    fun `create new distribution with existing ongoing distribution`() {
        every { distributionRepository.getCurrentDistribution() } returns testDistributionEntity

        val exception = assertThrows(TafelValidationException::class.java) {
            service.createNewDistribution()
        }

        assertThat(exception.message).isEqualTo("Ausgabe bereits gestartet!")
    }

    @Test
    fun `current distribution found`() {
        every { distributionRepository.getCurrentDistribution() } returns testDistributionEntity

        val distribution = service.getCurrentDistribution()

        assertThat(distribution!!.id).isEqualTo(testDistributionEntity.id)
    }

    @Test
    fun `current distribution not found`() {
        every { distributionRepository.getCurrentDistribution() } returns null

        val distribution = service.getCurrentDistribution()

        assertThat(distribution).isNull()
    }

    @Test
    fun `close distribution when not open`() {
        every { distributionRepository.getCurrentDistribution() } returns null

        val exception = assertThrows<TafelValidationException> { service.closeDistribution() }
        assertThat(exception.message).isEqualTo("Ausgabe nicht gestartet!")
    }

    @Test
    fun `close distribution when open`() {
        val distributionEntity = testDistributionEntity
        every { distributionRepository.getCurrentDistribution() } returns distributionEntity

        val savedDistributionId = 123L
        val savedDistribution = mockk<DistributionEntity>()
        every { savedDistribution.id } returns savedDistributionId
        every { distributionRepository.save(any()) } returns savedDistribution

        every { userRepository.findByUsername(authentication.username!!) } returns testUserEntity

        service.closeDistribution()

        verify {
            distributionRepository.save(withArg {
                assertThat(it.endedAt).isBetween(LocalDateTime.now().minusSeconds(5), LocalDateTime.now())
                assertThat(it.endedByUser).isEqualTo(testUserEntity)
            })
        }
        verify { distributionPostProcessorService.process(savedDistributionId) }
        verify(exactly = 1) { transactionTemplate.executeWithoutResult(any()) }
    }

    @Test
    fun `close distribution when statistic data is missing`() {
        every { distributionRepository.getCurrentDistribution() } returns DistributionEntity()

        val exception = assertThrows<TafelValidationException> { service.closeDistribution() }
        assertThat(exception.message).isEqualTo("Statistik-Daten fehlen!")
    }

    @Test
    fun `assign customer when customer doesnt exist`() {
        val distributionEntity = DistributionEntity()
        distributionEntity.id = 123
        val customerId = 1L
        val ticketNumber = 200

        every { distributionRepository.getCurrentDistribution() } returns testDistributionEntity
        every { customerRepository.findByCustomerId(customerId) } returns null

        val exception = assertThrows<TafelValidationException> {
            service.assignCustomerToDistribution(
                distribution = distributionEntity,
                customerId = customerId,
                ticketNumber = ticketNumber
            )
        }

        assertThat(exception.message).isEqualTo("Kunde Nr. $customerId nicht vorhanden!")
    }

    @Test
    fun `assign customer successful`() {
        val distributionEntity = DistributionEntity()
        distributionEntity.id = 123
        val customerId = 1L
        val ticketNumber = 200

        every { distributionRepository.getCurrentDistribution() } returns testDistributionEntity
        every { customerRepository.findByCustomerId(customerId) } returns testCustomerEntity1
        every { distributionCustomerRepository.save(any()) } returns mockk()

        service.assignCustomerToDistribution(
            distribution = distributionEntity,
            customerId = customerId,
            ticketNumber = ticketNumber
        )

        verify {
            distributionCustomerRepository.save(withArg {
                assertThat(it.customer).isEqualTo(testCustomerEntity1)
                assertThat(it.distribution).isEqualTo(testDistributionEntity)
                assertThat(it.ticketNumber).isEqualTo(ticketNumber)
            })
        }
    }

    @Test
    fun `generate customerlist pdf - no active distribution`() {
        every { distributionRepository.getCurrentDistribution() } returns null

        val exception = assertThrows<TafelValidationException> { service.generateCustomerListPdf() }

        assertThat(exception.message).isEqualTo("Ausgabe nicht gestartet!")
    }

    @Test
    fun `generate customerlist pdf - successful`() {
        val date = LocalDateTime.now()
        val testDistributionEntity = DistributionEntity().apply {
            id = 123
            startedAt = date
            customers = listOf(
                testDistributionCustomerEntity1,
                testDistributionCustomerEntity2,
                testDistributionCustomerEntity3
            )
        }
        every { distributionRepository.getCurrentDistribution() } returns testDistributionEntity

        val bytes = ByteArray(0)
        every { pdfService.generatePdf(any(), any()) } returns bytes

        val result = service.generateCustomerListPdf()

        val expectedFormattedDate = DateTimeFormatter.ofPattern("dd.MM.yyyy").format(date)
        assertThat(result?.filename).isEqualTo("kundenliste-ausgabe-$expectedFormattedDate.pdf")
        assertThat(result?.bytes).isEqualTo(bytes)

        val customerListPdfModelSlot = slot<CustomerListPdfModel>()
        verify {
            pdfService.generatePdf(
                capture(customerListPdfModelSlot),
                withArg {
                    assertThat(it).isEqualTo("/pdf-templates/distribution-customerlist/customerlist.xsl")
                }
            )
        }

        val pdfModel = customerListPdfModelSlot.captured
        assertThat(pdfModel).isEqualTo(
            CustomerListPdfModel(
                title = "Kundenliste zur Ausgabe vom $expectedFormattedDate",
                halftimeTicketNumber = 51,
                countCustomersOverall = 3,
                countPersonsOverall = 4,
                customers = listOf(
                    CustomerListItem(
                        ticketNumber = 50,
                        customerId = 100,
                        countPersons = 2,
                        countInfants = 1
                    ),
                    CustomerListItem(
                        ticketNumber = 51,
                        customerId = 200,
                        countPersons = 1,
                        countInfants = 0
                    ),
                    CustomerListItem(
                        ticketNumber = 52,
                        customerId = 300,
                        countPersons = 1,
                        countInfants = 0
                    )
                )
            )
        )
    }

    @Test
    fun `get current ticket without open distribution`() {
        every { service.getCurrentDistribution() } returns null

        val exception = assertThrows<TafelValidationException> { service.getCurrentTicketNumber(123) }
        assertThat(exception.message).isEqualTo("Ausgabe nicht gestartet!")
    }

    @Test
    fun `get current ticketNumber without registered customers`() {
        every { distributionRepository.getCurrentDistribution() } returns testDistributionEntity

        val ticket = service.getCurrentTicketNumber()

        assertThat(ticket).isNull()
    }

    @Test
    fun `get current ticketNumber with open tickets left`() {
        val testDistributionEntity = DistributionEntity().apply {
            id = 123
            customers = listOf(
                testDistributionCustomerEntity1,
                testDistributionCustomerEntity2
            )
        }
        every { distributionRepository.getCurrentDistribution() } returns testDistributionEntity

        val ticket = service.getCurrentTicketNumber()

        assertThat(ticket).isEqualTo(51)
    }

    @Test
    fun `get current ticketNumber for customer`() {
        val testDistributionEntity = DistributionEntity().apply {
            id = 123
            customers = listOf(
                testDistributionCustomerEntity1,
                testDistributionCustomerEntity2
            )
        }
        every { distributionRepository.getCurrentDistribution() } returns testDistributionEntity

        val ticket =
            service.getCurrentTicketNumber(
                testDistributionCustomerEntity2.customer!!.customerId
            )

        assertThat(ticket).isEqualTo(51)
    }

    @Test
    fun `get current ticketNumber with all tickets resolved`() {
        val testDistributionCustomerEntity1 = DistributionCustomerEntity().apply {
            id = 1
            createdAt = LocalDateTime.now()
            distribution = testDistributionEntity
            customer = testCustomerEntity1
            ticketNumber = 1
            processed = true
        }

        val testDistributionEntity = DistributionEntity().apply {
            id = 123
            customers = listOf(
                testDistributionCustomerEntity1
            )
        }
        every { distributionRepository.getCurrentDistribution() } returns testDistributionEntity

        val ticket = service.getCurrentTicketNumber()

        assertThat(ticket).isNull()
    }

    @Test
    fun `close ticket and next without open distribution`() {
        every { service.getCurrentDistribution() } returns null

        val exception = assertThrows<TafelValidationException> { service.closeCurrentTicketAndGetNext() }
        assertThat(exception.message).isEqualTo("Ausgabe nicht gestartet!")
    }

    @Test
    fun `close ticket and next without registered customers`() {
        every { distributionRepository.getCurrentDistribution() } returns testDistributionEntity

        val ticket = service.closeCurrentTicketAndGetNext()

        assertThat(ticket).isNull()
    }

    @Test
    fun `close ticket and next with open tickets left`() {
        every { distributionCustomerRepository.save(any()) } returns mockk<DistributionCustomerEntity>()

        val testDistributionCustomerEntity1 = DistributionCustomerEntity().apply {
            id = 1
            createdAt = LocalDateTime.now()
            distribution = testDistributionEntity
            customer = testCustomerEntity1
            ticketNumber = 1
            processed = false
        }

        val testDistributionCustomerEntity2 = DistributionCustomerEntity().apply {
            id = 2
            createdAt = LocalDateTime.now()
            distribution = testDistributionEntity
            customer = testCustomerEntity2
            ticketNumber = 2
            processed = false
        }

        val testDistributionEntity = DistributionEntity().apply {
            id = 123
            customers = listOf(
                testDistributionCustomerEntity1,
                testDistributionCustomerEntity2
            )
        }
        every { distributionRepository.getCurrentDistribution() } returns testDistributionEntity

        val ticket = service.closeCurrentTicketAndGetNext()

        assertThat(ticket).isEqualTo(2)
        verify {
            distributionCustomerRepository.save(withArg {
                assertThat(it.processed).isTrue()
            })
        }
    }

    @Test
    fun `close ticket and next with all tickets resolved`() {
        val testDistributionCustomerEntity1 = DistributionCustomerEntity().apply {
            id = 1
            createdAt = LocalDateTime.now()
            distribution = testDistributionEntity
            customer = testCustomerEntity1
            ticketNumber = 1
            processed = true
        }

        val testDistributionEntity = DistributionEntity().apply {
            id = 123
            customers = listOf(
                testDistributionCustomerEntity1
            )
        }
        every { distributionRepository.getCurrentDistribution() } returns testDistributionEntity

        val ticket = service.closeCurrentTicketAndGetNext()

        assertThat(ticket).isNull()
    }

    @Test
    fun `delete current ticket without open distribution`() {
        every { service.getCurrentDistribution() } returns null

        val exception = assertThrows<TafelValidationException> { service.deleteCurrentTicket(123) }
        assertThat(exception.message).isEqualTo("Ausgabe nicht gestartet!")
    }

    @Test
    fun `delete current ticket of customer`() {
        val testDistributionEntity = DistributionEntity().apply {
            id = 123
            customers = listOf(
                testDistributionCustomerEntity1,
                testDistributionCustomerEntity2
            )
        }
        every { distributionRepository.getCurrentDistribution() } returns testDistributionEntity

        val result =
            service.deleteCurrentTicket(testDistributionCustomerEntity2.customer!!.customerId!!)

        assertThat(result).isTrue()
        verify(exactly = 1) { distributionCustomerRepository.delete(testDistributionCustomerEntity2) }
    }

    @Test
    fun `update statistic data of distribution`() {
        val updatedEmployeeCount = 100
        val selectedShelters = listOf(testShelter1, testShelter2)
        val selectedShelterIds = selectedShelters.mapNotNull { it.id }

        val testDistributionEntity = DistributionEntity().apply {
            statistic = DistributionStatisticEntity().apply {
                employeeCount = 1
            }
        }
        every { distributionRepository.getCurrentDistribution() } returns testDistributionEntity
        every { distributionRepository.save(any()) } returns mockk()
        every { shelterRepository.findAllById(selectedShelterIds) } returns listOf(testShelter1, testShelter2)

        service.updateDistributionStatisticData(updatedEmployeeCount, selectedShelterIds)

        val updatedDistributionEntitySlot = slot<DistributionEntity>()
        verify(exactly = 1) { distributionRepository.save(capture(updatedDistributionEntitySlot)) }

        val updatedDistributionEntity = updatedDistributionEntitySlot.captured
        assertThat(updatedDistributionEntity.statistic!!.employeeCount).isEqualTo(updatedEmployeeCount)

        val firstShelter = updatedDistributionEntity.statistic!!.shelters.first()
        assertThat(firstShelter).isNotNull
        assertThat(firstShelter.id).isNull()
        assertThat(firstShelter.createdAt).isNotNull()
        assertThat(firstShelter.updatedAt).isNotNull()
        assertThat(firstShelter.name).isEqualTo(testShelter1.name)
        assertThat(firstShelter.addressStreet).isEqualTo(testShelter1.addressStreet)
        assertThat(firstShelter.addressHouseNumber).isEqualTo(testShelter1.addressHouseNumber)
        assertThat(firstShelter.addressStairway).isEqualTo(testShelter1.addressStairway)
        assertThat(firstShelter.addressPostalCode).isEqualTo(testShelter1.addressPostalCode)
        assertThat(firstShelter.addressDoor).isEqualTo(testShelter1.addressDoor)
        assertThat(firstShelter.addressCity).isEqualTo(testShelter1.addressCity)
        assertThat(firstShelter.personsCount).isEqualTo(testShelter1.personsCount)

        val secondShelter = updatedDistributionEntity.statistic!!.shelters[1]
        assertThat(secondShelter).isNotNull
    }

    @Test
    fun `update notes data of distribution`() {
        val notes = "  test notes, easy peasy  "

        val testDistributionEntity = DistributionEntity()
        every { distributionRepository.getCurrentDistribution() } returns testDistributionEntity
        every { distributionRepository.save(any()) } returns mockk()

        service.updateDistributionNoteData(notes)

        val updatedDistributionEntitySlot = slot<DistributionEntity>()
        verify(exactly = 1) { distributionRepository.save(capture(updatedDistributionEntitySlot)) }

        val updatedDistributionEntity = updatedDistributionEntitySlot.captured
        assertThat(updatedDistributionEntity.notes).isEqualTo(notes.trim())
    }

    @Test
    fun `update sanitized notes data of distribution`() {
        val notes = "   "

        val testDistributionEntity = DistributionEntity()
        every { distributionRepository.getCurrentDistribution() } returns testDistributionEntity
        every { distributionRepository.save(any()) } returns mockk()

        service.updateDistributionNoteData(notes)

        val updatedDistributionEntitySlot = slot<DistributionEntity>()
        verify(exactly = 1) { distributionRepository.save(capture(updatedDistributionEntitySlot)) }

        val updatedDistributionEntity = updatedDistributionEntitySlot.captured
        assertThat(updatedDistributionEntity.notes).isNull()
    }

    @Test
    @Disabled
    // TODO maybe also add a pdf comparison (probably after OS problems fixed)
    fun `generate customerlist pdf - compare`() {
    }

}
