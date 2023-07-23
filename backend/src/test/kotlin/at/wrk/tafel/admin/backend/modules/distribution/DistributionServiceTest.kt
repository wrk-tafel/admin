package at.wrk.tafel.admin.backend.modules.distribution

import at.wrk.tafel.admin.backend.common.auth.model.TafelJwtAuthentication
import at.wrk.tafel.admin.backend.common.model.DistributionState
import at.wrk.tafel.admin.backend.common.pdf.PDFService
import at.wrk.tafel.admin.backend.database.entities.customer.CustomerAddPersonEntity
import at.wrk.tafel.admin.backend.database.entities.customer.CustomerEntity
import at.wrk.tafel.admin.backend.database.entities.distribution.DistributionCustomerEntity
import at.wrk.tafel.admin.backend.database.entities.distribution.DistributionEntity
import at.wrk.tafel.admin.backend.database.repositories.auth.UserRepository
import at.wrk.tafel.admin.backend.database.repositories.customer.CustomerRepository
import at.wrk.tafel.admin.backend.database.repositories.distribution.DistributionCustomerRepository
import at.wrk.tafel.admin.backend.database.repositories.distribution.DistributionRepository
import at.wrk.tafel.admin.backend.modules.base.exception.TafelValidationException
import at.wrk.tafel.admin.backend.modules.base.testCountry
import at.wrk.tafel.admin.backend.modules.distribution.model.CustomerListItem
import at.wrk.tafel.admin.backend.modules.distribution.model.CustomerListPdfModel
import at.wrk.tafel.admin.backend.security.testUser
import at.wrk.tafel.admin.backend.security.testUserEntity
import at.wrk.tafel.admin.backend.security.testUserPermissions
import io.mockk.every
import io.mockk.impl.annotations.InjectMockKs
import io.mockk.impl.annotations.RelaxedMockK
import io.mockk.junit5.MockKExtension
import io.mockk.mockk
import io.mockk.slot
import io.mockk.verify
import org.assertj.core.api.Assertions.assertThat
import org.junit.jupiter.api.*
import org.junit.jupiter.api.Assertions.*
import org.junit.jupiter.api.extension.ExtendWith
import org.springframework.security.core.authority.SimpleGrantedAuthority
import org.springframework.security.core.context.SecurityContextHolder
import org.springframework.security.core.context.SecurityContextImpl
import java.math.BigDecimal
import java.time.LocalDate
import java.time.ZonedDateTime
import java.time.format.DateTimeFormatter
import java.util.*

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

    @InjectMockKs
    private lateinit var service: DistributionService

    private val authentication = TafelJwtAuthentication(
        tokenValue = "TOKEN",
        username = testUser.username,
        authorities = testUserPermissions.map { SimpleGrantedAuthority(it) }
    )

    private lateinit var testCustomerEntity1: CustomerEntity
    private lateinit var testCustomerEntity2: CustomerEntity

    @BeforeEach
    fun beforeEach() {
        SecurityContextHolder.setContext(SecurityContextImpl(authentication))

        testCustomerEntity1 = CustomerEntity().apply {
            id = 1
            issuer = testUserEntity
            createdAt = ZonedDateTime.now()
            customerId = 100
            lastname = "Mustermann"
            firstname = "Max"
            birthDate = LocalDate.now().minusYears(30)
            country = testCountry
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
            addPerson1.country = testCountry
            addPerson1.excludeFromHousehold = false

            val addPerson2 = CustomerAddPersonEntity()
            addPerson2.id = 3
            addPerson2.lastname = "Add pers 2"
            addPerson2.firstname = "Add pers 2"
            addPerson2.birthDate = LocalDate.now().minusYears(2)
            addPerson2.country = testCountry
            addPerson2.excludeFromHousehold = true

            additionalPersons = mutableListOf(addPerson1, addPerson2)
        }

        testCustomerEntity2 = CustomerEntity().apply {
            id = 2
            createdAt = ZonedDateTime.now()
            customerId = 200
            lastname = "Mustermann"
            firstname = "Max 2"
            birthDate = LocalDate.now().minusYears(22)
            country = testCountry
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

        every { userRepository.findByUsername(authentication.username!!) } returns Optional.of(testUserEntity)
    }

    @AfterEach
    fun afterEach() {
        SecurityContextHolder.clearContext()
    }

    @Test
    fun `create new distribution`() {
        every { userRepository.findByUsername(authentication.username!!) } returns Optional.of(testUserEntity)
        every { distributionRepository.findFirstByEndedAtIsNullOrderByStartedAtDesc() } returns null

        val distributionEntity = DistributionEntity()
        distributionEntity.id = 123
        every { distributionRepository.save(any()) } returns distributionEntity

        val distribution = service.createNewDistribution()

        assertThat(distribution).isEqualTo(distributionEntity)

        verify {
            distributionRepository.save(withArg {
                assertThat(it.startedAt).isBetween(ZonedDateTime.now().minusSeconds(1), ZonedDateTime.now())
                assertThat(it.endedAt).isNull()
                assertThat(it.startedByUser).isEqualTo(testUserEntity)
            })
        }
    }

    @Test
    fun `create new distribution with existing ongoing distribution`() {
        every { distributionRepository.findFirstByEndedAtIsNullOrderByStartedAtDesc() } returns testDistributionEntity

        val exception = assertThrows(TafelValidationException::class.java) {
            service.createNewDistribution()
        }

        assertThat(exception.message).isEqualTo("Ausgabe bereits gestartet!")
    }

    @Test
    fun `current distribution found`() {
        every { distributionRepository.findFirstByEndedAtIsNullOrderByStartedAtDesc() } returns testDistributionEntity

        val distribution = service.getCurrentDistribution()

        assertThat(distribution!!.id).isEqualTo(testDistributionEntity.id)
    }

    @Test
    fun `current distribution not found`() {
        every { distributionRepository.findFirstByEndedAtIsNullOrderByStartedAtDesc() } returns null

        val distribution = service.getCurrentDistribution()

        assertThat(distribution).isNull()
    }

    @Test
    fun `get state list`() {
        val states = service.getStates()

        assertThat(states).isEqualTo(
            listOf(
                DistributionState.OPEN,
                DistributionState.CHECKIN,
                DistributionState.PAUSE,
                DistributionState.DISTRIBUTION,
                DistributionState.CLOSED
            )
        )
    }

    @Test
    fun `switch from open to next state`() {
        val distributionEntity = testDistributionEntity.apply { state = DistributionState.OPEN }
        every { distributionRepository.findFirstByEndedAtIsNullOrderByStartedAtDesc() } returns distributionEntity

        every { distributionRepository.save(any()) } returns mockk()

        service.switchToNextState(distributionEntity.state!!)

        verify {
            distributionRepository.save(withArg {
                assertThat(it.state).isEqualTo(DistributionState.CHECKIN)
            })
        }
    }

    @Test
    fun `switch to closed state`() {
        every { distributionRepository.findFirstByEndedAtIsNullOrderByStartedAtDesc() } returns testDistributionEntity
        every { distributionRepository.save(any()) } returns mockk()

        every { userRepository.findByUsername(authentication.username!!) } returns Optional.of(testUserEntity)

        service.switchToNextState(testDistributionEntity.state!!)

        verify {
            distributionRepository.save(withArg {
                assertThat(it.state).isEqualTo(DistributionState.CLOSED)
                assertThat(it.endedAt).isBetween(ZonedDateTime.now().minusSeconds(5), ZonedDateTime.now())
                assertThat(it.endedByUser).isEqualTo(testUserEntity)
            })
        }
    }

    @Test
    fun `assign customer when customer doesnt exist`() {
        val distributionEntity = DistributionEntity()
        distributionEntity.id = 123
        val customerId = 1L
        val ticketNumber = 200

        every { distributionRepository.findFirstByEndedAtIsNullOrderByStartedAtDesc() } returns testDistributionEntity
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

        every { distributionRepository.findFirstByEndedAtIsNullOrderByStartedAtDesc() } returns testDistributionEntity
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
        every { distributionRepository.findFirstByEndedAtIsNullOrderByStartedAtDesc() } returns null

        val exception = assertThrows<TafelValidationException> { service.generateCustomerListPdf() }

        assertThat(exception.message).isEqualTo("Ausgabe nicht gestartet!")
    }

    @Test
    fun `generate customerlist pdf - successful`() {
        val date = ZonedDateTime.now()
        val testDistributionEntity = DistributionEntity().apply {
            id = 123
            state = DistributionState.DISTRIBUTION
            startedAt = date
            customers = listOf(
                testDistributionCustomerEntity1,
                testDistributionCustomerEntity2,
                testDistributionCustomerEntity3
            )
        }
        every { distributionRepository.findFirstByEndedAtIsNullOrderByStartedAtDesc() } returns testDistributionEntity

        val bytes = ByteArray(0)
        every { pdfService.generatePdf(any(), any()) } returns bytes

        val result = service.generateCustomerListPdf()

        val expectedFormattedDate = DateTimeFormatter.ofPattern("dd.MM.yyyy").format(date)
        assertThat(result?.filename).isEqualTo("kundenliste-ausgabe-$expectedFormattedDate.pdf")
        assertThat(result?.bytes).isEqualTo(bytes)

        verify {
            pdfService.generatePdf(
                withArg {
                    assertThat(it).isEqualTo(
                        CustomerListPdfModel(
                            title = "Kundenliste zur Ausgabe vom $expectedFormattedDate",
                            halftimeTicketNumber = 51,
                            customers = listOf(
                                CustomerListItem(
                                    ticketNumber = 50,
                                    customerId = 100,
                                    name = "Mustermann Max",
                                    countPersons = 3,
                                    countInfants = 1
                                ),
                                CustomerListItem(
                                    ticketNumber = 51,
                                    customerId = 200,
                                    name = "Mustermann Max 2",
                                    countPersons = 1,
                                    countInfants = 0
                                ),
                                CustomerListItem(
                                    ticketNumber = 52,
                                    customerId = 300,
                                    name = "Mustermann Max 3",
                                    countPersons = 1,
                                    countInfants = 0
                                )
                            )
                        )
                    )
                },
                withArg {
                    assertThat(it).isEqualTo("/pdf-templates/distribution-customerlist/customerlist.xsl")
                }
            )
        }
    }

    @Test
    fun `get current ticketNumber without registered customers`() {
        val ticket = service.getCurrentTicketNumber(testDistributionEntity)

        assertThat(ticket).isNull()
    }

    @Test
    fun `get current ticketNumber with open tickets left`() {
        val testDistributionEntity = DistributionEntity().apply {
            id = 123
            state = DistributionState.DISTRIBUTION
            customers = listOf(
                testDistributionCustomerEntity1,
                testDistributionCustomerEntity2
            )
        }

        val ticket = service.getCurrentTicketNumber(testDistributionEntity)

        assertThat(ticket).isEqualTo(50)
    }

    @Test
    fun `get current ticketNumber for customer`() {
        val testDistributionEntity = DistributionEntity().apply {
            id = 123
            state = DistributionState.DISTRIBUTION
            customers = listOf(
                testDistributionCustomerEntity1,
                testDistributionCustomerEntity2
            )
        }

        val ticket =
            service.getCurrentTicketNumber(
                testDistributionEntity,
                testDistributionCustomerEntity2.customer!!.customerId
            )

        assertThat(ticket).isEqualTo(51)
    }

    @Test
    fun `get current ticketNumber with all tickets resolved`() {
        val testDistributionCustomerEntity1 = DistributionCustomerEntity().apply {
            id = 1
            createdAt = ZonedDateTime.now()
            distribution = testDistributionEntity
            customer = testCustomerEntity1
            ticketNumber = 1
            processed = true
        }

        val testDistributionEntity = DistributionEntity().apply {
            id = 123
            state = DistributionState.DISTRIBUTION
            customers = listOf(
                testDistributionCustomerEntity1
            )
        }

        val ticket = service.getCurrentTicketNumber(testDistributionEntity)

        assertThat(ticket).isNull()
    }

    @Test
    fun `close ticket and next without registered customers`() {
        val ticket = service.closeCurrentTicketAndGetNext(testDistributionEntity)

        assertThat(ticket).isNull()
    }

    @Test
    fun `close ticket and next with open tickets left`() {
        every { distributionCustomerRepository.save(any()) } returns mockk<DistributionCustomerEntity>()

        val testDistributionCustomerEntity1 = DistributionCustomerEntity().apply {
            id = 1
            createdAt = ZonedDateTime.now()
            distribution = testDistributionEntity
            customer = testCustomerEntity1
            ticketNumber = 1
            processed = false
        }

        val testDistributionCustomerEntity2 = DistributionCustomerEntity().apply {
            id = 2
            createdAt = ZonedDateTime.now()
            distribution = testDistributionEntity
            customer = testCustomerEntity2
            ticketNumber = 2
            processed = false
        }

        val testDistributionEntity = DistributionEntity().apply {
            id = 123
            state = DistributionState.DISTRIBUTION
            customers = listOf(
                testDistributionCustomerEntity1,
                testDistributionCustomerEntity2
            )
        }

        val ticket = service.closeCurrentTicketAndGetNext(testDistributionEntity)

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
            createdAt = ZonedDateTime.now()
            distribution = testDistributionEntity
            customer = testCustomerEntity1
            ticketNumber = 1
            processed = true
        }

        val testDistributionEntity = DistributionEntity().apply {
            id = 123
            state = DistributionState.DISTRIBUTION
            customers = listOf(
                testDistributionCustomerEntity1
            )
        }

        val ticket = service.closeCurrentTicketAndGetNext(testDistributionEntity)

        assertThat(ticket).isNull()
    }

    @Test
    fun `delete current ticket of customer`() {
        val testDistributionEntity = DistributionEntity().apply {
            id = 123
            state = DistributionState.DISTRIBUTION
            customers = listOf(
                testDistributionCustomerEntity1,
                testDistributionCustomerEntity2
            )
        }

        val result =
            service.deleteCurrentTicket(testDistributionEntity, testDistributionCustomerEntity2.customer!!.customerId!!)

        assertThat(result).isTrue()
        verify(exactly = 1) { distributionCustomerRepository.delete(testDistributionCustomerEntity2) }
    }

    @Test
    fun `auto close current distribution`() {
        val testDistributionEntity = DistributionEntity().apply {
            id = 123
            state = DistributionState.DISTRIBUTION
            customers = listOf(
                testDistributionCustomerEntity1,
                testDistributionCustomerEntity2
            )
        }
        every { distributionRepository.findFirstByEndedAtIsNullOrderByStartedAtDesc() } returns testDistributionEntity
        every { distributionRepository.save(any()) } returns mockk()

        service.autoCloseDistribution()

        val savedDistributionSlot = slot<DistributionEntity>()
        verify(exactly = 1) {
            distributionRepository.save(capture(savedDistributionSlot))
        }

        val saveDistribution = savedDistributionSlot.captured
        assertThat(saveDistribution.endedAt).isNotNull()
        assertThat(saveDistribution.state).isEqualTo(DistributionState.CLOSED)
    }

    @Test
    @Disabled
    // TODO maybe also add a pdf comparison (probably after OS problems fixed)
    fun `generate customerlist pdf - compare`() {
    }

}
