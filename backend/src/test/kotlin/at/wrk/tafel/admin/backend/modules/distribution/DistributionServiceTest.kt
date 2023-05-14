package at.wrk.tafel.admin.backend.modules.distribution

import at.wrk.tafel.admin.backend.common.auth.model.TafelJwtAuthentication
import at.wrk.tafel.admin.backend.common.model.DistributionState
import at.wrk.tafel.admin.backend.common.pdf.PDFService
import at.wrk.tafel.admin.backend.database.entities.distribution.DistributionEntity
import at.wrk.tafel.admin.backend.database.repositories.auth.UserRepository
import at.wrk.tafel.admin.backend.database.repositories.customer.CustomerRepository
import at.wrk.tafel.admin.backend.database.repositories.distribution.DistributionCustomerRepository
import at.wrk.tafel.admin.backend.database.repositories.distribution.DistributionRepository
import at.wrk.tafel.admin.backend.modules.base.exception.TafelValidationException
import at.wrk.tafel.admin.backend.modules.customer.testCustomerEntity1
import at.wrk.tafel.admin.backend.modules.customer.testDistributionCustomerEntity1
import at.wrk.tafel.admin.backend.modules.customer.testDistributionCustomerEntity2
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
import io.mockk.verify
import org.assertj.core.api.Assertions.assertThat
import org.junit.jupiter.api.*
import org.junit.jupiter.api.Assertions.*
import org.junit.jupiter.api.extension.ExtendWith
import org.springframework.security.core.authority.SimpleGrantedAuthority
import org.springframework.security.core.context.SecurityContextHolder
import org.springframework.security.core.context.SecurityContextImpl
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

    @BeforeEach
    fun beforeEach() {
        SecurityContextHolder.setContext(SecurityContextImpl(authentication))
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
                assertThat(it.processed).isFalse()
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
            customers = listOf(testDistributionCustomerEntity1, testDistributionCustomerEntity2)
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
                            customers = listOf(
                                CustomerListItem(
                                    ticketNumber = 1,
                                    name = "Mustermann Max",
                                    countPersons = 3,
                                    countInfants = 1
                                ),
                                CustomerListItem(
                                    ticketNumber = 2,
                                    name = "Mustermann Max 2",
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
    @Disabled
    // TODO maybe also add a pdf comparison (probably after OS problems fixed)
    fun `generate customerlist pdf - compare`() {
    }

}
