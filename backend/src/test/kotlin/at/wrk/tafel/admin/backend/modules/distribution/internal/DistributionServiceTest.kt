package at.wrk.tafel.admin.backend.modules.distribution.internal

import at.wrk.tafel.admin.backend.common.auth.model.TafelJwtAuthentication
import at.wrk.tafel.admin.backend.common.pdf.PDFService
import at.wrk.tafel.admin.backend.database.common.lock.AdvisoryLockService
import at.wrk.tafel.admin.backend.database.model.auth.UserRepository
import at.wrk.tafel.admin.backend.database.model.distribution.*
import at.wrk.tafel.admin.backend.database.model.household.HouseholdEntity
import at.wrk.tafel.admin.backend.database.model.household.HouseholdRepository
import at.wrk.tafel.admin.backend.database.model.logistics.FoodCollectionEntity
import at.wrk.tafel.admin.backend.database.model.logistics.RouteRepository
import at.wrk.tafel.admin.backend.database.model.logistics.ShelterRepository
import at.wrk.tafel.admin.backend.database.model.person.PersonEntity
import at.wrk.tafel.admin.backend.modules.base.country.testCountry1
import at.wrk.tafel.admin.backend.modules.base.exception.ConflictException
import at.wrk.tafel.admin.backend.modules.base.exception.NotFoundException
import at.wrk.tafel.admin.backend.modules.distribution.DistributionClosedEvent
import at.wrk.tafel.admin.backend.modules.distribution.internal.model.DistributionItem
import at.wrk.tafel.admin.backend.modules.distribution.internal.model.HouseholdListItem
import at.wrk.tafel.admin.backend.modules.distribution.internal.model.HouseholdListPdfModel
import at.wrk.tafel.admin.backend.modules.distribution.internal.ticket.TicketScreenTicketResponse
import at.wrk.tafel.admin.backend.modules.logistics.*
import at.wrk.tafel.admin.backend.security.testUser
import at.wrk.tafel.admin.backend.security.testUserEntity
import at.wrk.tafel.admin.backend.security.testUserPermissions
import com.github.romankh3.image.comparison.ImageComparison
import com.github.romankh3.image.comparison.model.ImageComparisonState
import com.github.romankh3.image.comparison.model.Rectangle
import io.mockk.every
import io.mockk.impl.annotations.InjectMockKs
import io.mockk.impl.annotations.RelaxedMockK
import io.mockk.impl.annotations.SpyK
import io.mockk.junit5.MockKExtension
import io.mockk.mockk
import io.mockk.slot
import io.mockk.verify
import org.apache.commons.io.FileUtils
import org.apache.pdfbox.Loader
import org.apache.pdfbox.rendering.ImageType
import org.apache.pdfbox.rendering.PDFRenderer
import org.assertj.core.api.Assertions.assertThat
import org.junit.jupiter.api.*
import org.junit.jupiter.api.extension.ExtendWith
import org.springframework.context.ApplicationEventPublisher
import org.springframework.data.repository.findByIdOrNull
import org.springframework.security.core.authority.SimpleGrantedAuthority
import org.springframework.security.core.context.SecurityContextHolder
import org.springframework.security.core.context.SecurityContextImpl
import org.springframework.transaction.support.TransactionTemplate
import java.io.File
import java.math.BigDecimal
import java.time.LocalDate
import java.time.LocalDateTime
import java.time.format.DateTimeFormatter
import javax.imageio.ImageIO

@ExtendWith(MockKExtension::class)
internal class DistributionServiceTest {

    companion object {
        private val comparisonResultDirectory = File(
            System.getProperty("user.dir"),
            "build/custom-test-results/distributionservice-customerlist-comparison-results",
        )
        private const val CUSTOMER_LIST_REFERENCES_PATH = "/pdf-references/distribution/customerlist-references"

        @JvmStatic
        @BeforeAll
        fun beforeAll() {
            comparisonResultDirectory.mkdirs()
        }
    }

    @RelaxedMockK
    private lateinit var distributionRepository: DistributionRepository

    @RelaxedMockK
    private lateinit var userRepository: UserRepository

    @RelaxedMockK
    private lateinit var distributionHouseholdRepository: DistributionHouseholdRepository

    @RelaxedMockK
    private lateinit var householdRepository: HouseholdRepository

    @RelaxedMockK
    private lateinit var pdfService: PDFService

    @SpyK
    private var transactionTemplate: TransactionTemplate = TransactionTemplate(mockk(relaxed = true))

    @RelaxedMockK
    private lateinit var shelterRepository: ShelterRepository

    @RelaxedMockK
    private lateinit var routeRepository: RouteRepository

    @RelaxedMockK
    private lateinit var advisoryLockService: AdvisoryLockService

    @RelaxedMockK
    private lateinit var eventPublisher: ApplicationEventPublisher

    @InjectMockKs
    private lateinit var service: DistributionService

    private val authentication = TafelJwtAuthentication(
        tokenValue = "TOKEN",
        username = testUser.username,
        authorities = testUserPermissions.map { SimpleGrantedAuthority(it.key) },
    )

    private lateinit var testHouseholdEntity1: HouseholdEntity
    private lateinit var testHouseholdEntity2: HouseholdEntity

    @BeforeEach
    fun beforeEach() {
        SecurityContextHolder.setContext(SecurityContextImpl(authentication))

        testHouseholdEntity1 = HouseholdEntity().apply {
            id = 1
            issuer = testUserEntity.employee
            createdAt = LocalDateTime.now()
            householdId = 100
            addressStreet = "Test-Straße"
            addressHouseNumber = "100"
            addressStairway = "1"
            addressPostalCode = 1010
            addressDoor = "21"
            addressCity = "Wien"
            telephoneNumber = "0043660123123"
            email = "test@mail.com"
            validUntil = LocalDate.now()
            locked = false

            val mainPersonEntity = PersonEntity()
            mainPersonEntity.id = 1
            mainPersonEntity.household = this
            mainPersonEntity.isMainPerson = true
            mainPersonEntity.lastname = "Mustermann"
            mainPersonEntity.firstname = "Max"
            mainPersonEntity.birthDate = LocalDate.now().minusYears(30)
            mainPersonEntity.country = testCountry1
            mainPersonEntity.employer = "Employer 123"
            mainPersonEntity.income = BigDecimal("1000")
            mainPersonEntity.incomeDue = LocalDate.now()

            val addPerson1 = PersonEntity()
            addPerson1.id = 2
            addPerson1.household = this
            addPerson1.lastname = "Add pers 1"
            addPerson1.firstname = "Add pers 1"
            addPerson1.birthDate = LocalDate.now().minusYears(5)
            addPerson1.income = BigDecimal("100")
            addPerson1.incomeDue = LocalDate.now()
            addPerson1.country = testCountry1
            addPerson1.excludeFromHousehold = false

            val addPerson2 = PersonEntity()
            addPerson2.id = 3
            addPerson2.household = this
            addPerson2.lastname = "Add pers 2"
            addPerson2.firstname = "Add pers 2"
            addPerson2.birthDate = LocalDate.now().minusYears(2)
            addPerson2.country = testCountry1
            addPerson2.excludeFromHousehold = true

            persons = mutableListOf(mainPersonEntity, addPerson1, addPerson2)
            mainPerson = mainPersonEntity
        }

        testHouseholdEntity2 = HouseholdEntity().apply {
            id = 2
            createdAt = LocalDateTime.now()
            householdId = 200
            addressStreet = "Test-Straße 2"
            addressHouseNumber = "200"
            addressStairway = "1-2"
            addressPostalCode = 1010
            addressDoor = "21-2"
            addressCity = "Wien 2"
            telephoneNumber = "0043660123123"
            email = "test2@mail.com"
            validUntil = LocalDate.now()
            locked = false

            val mainPersonEntity = PersonEntity()
            mainPersonEntity.id = 20
            mainPersonEntity.household = this
            mainPersonEntity.isMainPerson = true
            mainPersonEntity.lastname = "Mustermann"
            mainPersonEntity.firstname = "Max 2"
            mainPersonEntity.birthDate = LocalDate.now().minusYears(22)
            mainPersonEntity.country = testCountry1
            mainPersonEntity.employer = "Employer 123-2"
            mainPersonEntity.income = BigDecimal("2000")
            mainPersonEntity.incomeDue = LocalDate.now()

            persons = mutableListOf(mainPersonEntity)
            mainPerson = mainPersonEntity
        }

        every { userRepository.findByUsername(authentication.username!!) } returns testUserEntity
    }

    @AfterEach
    fun afterEach() {
        SecurityContextHolder.clearContext()
    }

    @Test
    fun `get distributions`() {
        every { distributionRepository.getDistributionEntityByEndedAtIsNotNullOrderByStartedAtDesc() } returns listOf(
            testDistributionEntity,
        )

        val distributions = service.getDistributions()

        assertThat(distributions).hasSameElementsAs(listOf(testDistributionEntity))
    }

    @Test
    fun `get distribution items`() {
        every { distributionRepository.getDistributionEntityByEndedAtIsNotNullOrderByStartedAtDesc() } returns listOf(
            testDistributionEntity,
        )

        val distributionItems = service.getDistributionItems()

        assertThat(distributionItems).containsExactly(
            DistributionItem(
                id = testDistributionEntity.id!!,
                startedAt = testDistributionEntity.startedAt!!,
                endedAt = testDistributionEntity.endedAt,
            ),
        )
    }

    @Test
    fun `create new distribution`() {
        every { userRepository.findByUsername(authentication.username!!) } returns testUserEntity
        every { distributionRepository.findFirstByOrderByIdDesc() } returns null

        val distributionEntity = DistributionEntity()
        distributionEntity.id = 123
        every { distributionRepository.save(any()) } returns distributionEntity
        every { advisoryLockService.tryWithLock(any(), any()) } answers {
            val block = secondArg<() -> Unit>()
            block.invoke()
            true
        }

        val distribution = service.createNewDistribution()

        assertThat(distribution).isEqualTo(distributionEntity)

        verify {
            distributionRepository.save(
                withArg {
                    assertThat(it.startedAt).isBetween(LocalDateTime.now().minusSeconds(1), LocalDateTime.now())
                    assertThat(it.endedAt).isNull()
                    assertThat(it.startedByUser).isEqualTo(testUserEntity)
                },
            )
        }
    }

    @Test
    fun `create new distribution item`() {
        every { userRepository.findByUsername(authentication.username!!) } returns testUserEntity
        every { distributionRepository.findFirstByOrderByIdDesc() } returns null

        val distributionEntity = DistributionEntity()
        distributionEntity.id = 123
        distributionEntity.startedAt = LocalDateTime.now()
        every { distributionRepository.save(any()) } returns distributionEntity
        every { advisoryLockService.tryWithLock(any(), any()) } answers {
            val block = secondArg<() -> Unit>()
            block.invoke()
            true
        }

        val distributionItem = service.createNewDistributionItem()

        assertThat(distributionItem).isEqualTo(
            DistributionItem(
                id = distributionEntity.id!!,
                startedAt = distributionEntity.startedAt!!,
                endedAt = distributionEntity.endedAt,
            ),
        )
    }

    @Test
    fun `create new distribution with existing ongoing distribution`() {
        val ongoingDistribution = testDistributionEntity.apply { endedAt = null }
        every { distributionRepository.findFirstByOrderByIdDesc() } returns ongoingDistribution
        every { advisoryLockService.tryWithLock(any(), any()) } answers {
            val block = secondArg<() -> Unit>()
            block.invoke()
            true
        }

        val exception = assertThrows<ConflictException> {
            service.createNewDistribution()
        }

        assertThat(exception.body.detail).isEqualTo("Ausgabe bereits gestartet!")
    }

    @Test
    fun `create new distribution with existing lock`() {
        every { advisoryLockService.tryWithLock(any(), any()) } returns false

        val exception = assertThrows<ConflictException> {
            service.createNewDistribution()
        }

        assertThat(exception.body.detail).isEqualTo("Eine neue Ausgabe wird gerade gestartet. Bitte kurz warten und im Anschluss die Seite neu laden.")
    }

    @Test
    fun `current distribution found`() {
        val activeDistribution = testDistributionEntity.apply { endedAt = null }
        every { distributionRepository.findFirstByOrderByIdDesc() } returns activeDistribution

        val distribution = service.getCurrentDistribution()

        assertThat(distribution!!.id).isEqualTo(testDistributionEntity.id)
    }

    @Test
    fun `current distribution not found`() {
        every { distributionRepository.findFirstByOrderByIdDesc() } returns null

        val distribution = service.getCurrentDistribution()

        assertThat(distribution).isNull()
    }

    @Test
    fun `current distribution item found`() {
        val activeDistribution = testDistributionEntity.apply { endedAt = null }
        every { distributionRepository.findFirstByOrderByIdDesc() } returns activeDistribution

        val distributionItem = service.getCurrentDistributionItem()

        assertThat(distributionItem).isEqualTo(
            DistributionItem(
                id = activeDistribution.id!!,
                startedAt = activeDistribution.startedAt!!,
                endedAt = activeDistribution.endedAt,
            ),
        )
    }

    @Test
    fun `current distribution item not found`() {
        every { distributionRepository.findFirstByOrderByIdDesc() } returns null

        val distributionItem = service.getCurrentDistributionItem()

        assertThat(distributionItem).isNull()
    }

    @Test
    fun `has current distribution true`() {
        every { distributionRepository.findFirstByOrderByIdDesc() } returns testDistributionEntity.apply { endedAt = null }

        assertThat(service.hasCurrentDistribution()).isTrue()
    }

    @Test
    fun `has current distribution false`() {
        every { distributionRepository.findFirstByOrderByIdDesc() } returns null

        assertThat(service.hasCurrentDistribution()).isFalse()
    }

    @Test
    fun `close distribution when open`() {
        val distributionEntity = testDistributionEntity.apply { endedAt = null }
        every { distributionRepository.findFirstByOrderByIdDesc() } returns distributionEntity

        val savedDistributionId = 123L
        val savedDistribution = mockk<DistributionEntity>()
        every { savedDistribution.id } returns savedDistributionId
        every { savedDistribution.startedAt } returns LocalDateTime.now().minusHours(1)
        every { savedDistribution.endedAt } returns LocalDateTime.now()
        every { distributionRepository.save(any()) } returns savedDistribution

        every { userRepository.findByUsername(authentication.username!!) } returns testUserEntity
        every { advisoryLockService.tryWithLock(any(), any()) } answers {
            val block = secondArg<() -> Unit>()
            block.invoke()
            true
        }

        service.closeDistribution()

        verify {
            distributionRepository.save(
                withArg {
                    assertThat(it.endedAt).isBetween(LocalDateTime.now().minusSeconds(5), LocalDateTime.now())
                    assertThat(it.endedByUser).isEqualTo(testUserEntity)
                },
            )
        }
        verify { eventPublisher.publishEvent(DistributionEndedEvent(savedDistributionId)) }
        verify(exactly = 1) { transactionTemplate.transactionManager }
    }

    @Test
    fun `close distribution forwards the error when publishing DistributionEndedEvent fails`() {
        val distributionEntity = testDistributionEntity.apply { endedAt = null }
        every { distributionRepository.findFirstByOrderByIdDesc() } returns distributionEntity

        val savedDistributionId = 123L
        val savedDistribution = mockk<DistributionEntity>()
        every { savedDistribution.id } returns savedDistributionId
        every { savedDistribution.startedAt } returns LocalDateTime.now().minusHours(1)
        every { savedDistribution.endedAt } returns LocalDateTime.now()
        every { distributionRepository.save(any()) } returns savedDistribution

        every { userRepository.findByUsername(authentication.username!!) } returns testUserEntity
        every { advisoryLockService.tryWithLock(any(), any()) } answers {
            val block = secondArg<() -> Unit>()
            block.invoke()
            true
        }
        every { eventPublisher.publishEvent(any<DistributionEndedEvent>()) } throws IllegalStateException("Test exception")

        val exception = assertThrows<IllegalStateException> { service.closeDistribution() }
        assertThat(exception.message).isEqualTo("Test exception")
    }

    @Test
    fun `validate close distribution when not open`() {
        every { distributionRepository.findFirstByOrderByIdDesc() } returns null

        val result = service.validateClose()

        assertThat(result.errors).containsExactly("Ausgabe nicht gestartet!")
        assertThat(result.warnings).isEmpty()
    }

    @Test
    fun `close distribution with existing lock`() {
        every { advisoryLockService.tryWithLock(any(), any()) } returns false

        val exception = assertThrows<ConflictException> {
            service.closeDistribution()
        }

        assertThat(exception.body.detail).isEqualTo("Die Ausgabe wird gerade geschlossen. Bitte kurz warten und im Anschluss die Seite neu laden.")
    }

    @Test
    fun `validate close distribution when statistic data is missing`() {
        every { distributionRepository.findFirstByOrderByIdDesc() } returns DistributionEntity().apply {
            endedAt = null
        }

        val result = service.validateClose()

        assertThat(result.errors).containsExactly("Statistik-Daten fehlen!")
        assertThat(result.warnings).isEmpty()
    }

    @Test
    fun `validate close distribution when not all routes are recorded`() {
        every { distributionRepository.findFirstByOrderByIdDesc() } returns DistributionEntity().apply {
            endedAt = null
            statistic = testDistributionStatisticEntity
            foodCollections = listOf(
                testFoodCollectionRoute1Entity,
            )
        }
        every { routeRepository.findAll() } returns listOf(testRoute1, testRoute2, testRoute3)

        val result = service.validateClose()

        assertThat(result.errors).isEmpty()
        assertThat(result.warnings).containsExactly("Die Route(n) 2.0, 3.0 wurden nicht erfasst!")
    }

    @Test
    fun `validate close distribution when a route is missing data`() {
        every { distributionRepository.findFirstByOrderByIdDesc() } returns DistributionEntity().apply {
            endedAt = null
            statistic = testDistributionStatisticEntity
            foodCollections = listOf(
                FoodCollectionEntity().apply {
                    route = testRoute1
                },
                FoodCollectionEntity().apply {
                    route = testRoute2
                },
            )
        }
        every { routeRepository.findAll() } returns listOf(testRoute1, testRoute2)

        val result = service.validateClose()

        assertThat(result.errors).containsExactly("Die Route(n) 1.0, 2.0 sind unvollständig!")
        assertThat(result.warnings).isEmpty()
    }

    @Test
    fun `assign customer without existing customer`() {
        val householdId = 1L
        val ticketNumber = 200

        val activeDistribution = testDistributionEntity.apply { endedAt = null }
        every { distributionRepository.findFirstByOrderByIdDesc() } returns activeDistribution
        every { householdRepository.findByHouseholdId(householdId) } returns null

        val exception = assertThrows<NotFoundException> {
            service.assignHouseholdToDistribution(
                householdId = householdId,
                ticketNumber = ticketNumber,
            )
        }

        assertThat(exception.body.detail).isEqualTo("Kunde Nr. $householdId nicht vorhanden!")
    }

    @Test
    fun `assign customer successful`() {
        val householdId = 1L
        val ticketNumber = 200

        val activeDistribution = testDistributionEntity.apply { endedAt = null }
        every { distributionRepository.findFirstByOrderByIdDesc() } returns activeDistribution
        every { householdRepository.findByHouseholdId(householdId) } returns testHouseholdEntity1
        every { distributionHouseholdRepository.save(any()) } returns mockk()

        service.assignHouseholdToDistribution(
            householdId = householdId,
            ticketNumber = ticketNumber,
        )

        verify {
            distributionHouseholdRepository.save(
                withArg {
                    assertThat(it.household).isEqualTo(testHouseholdEntity1)
                    assertThat(it.distribution).isEqualTo(activeDistribution)
                    assertThat(it.ticketNumber).isEqualTo(ticketNumber)
                },
            )
        }
    }

    @Test
    fun `assign customer with existing entry (update)`() {
        val testDistributionEntity = DistributionEntity().apply {
            id = 123
            endedAt = null
            households = listOf(
                testDistributionHouseholdEntity1,
            )
        }
        val householdId = 1L
        val updatedTicketNumber = 300

        every { distributionRepository.findFirstByOrderByIdDesc() } returns testDistributionEntity
        every { householdRepository.findByHouseholdId(householdId) } returns testHouseholdEntity1
        every { distributionHouseholdRepository.save(any()) } returns mockk()

        service.assignHouseholdToDistribution(
            householdId = householdId,
            ticketNumber = updatedTicketNumber,
        )

        verify {
            distributionHouseholdRepository.save(
                withArg {
                    assertThat(it.household).isEqualTo(testHouseholdEntity1)
                    assertThat(it.distribution).isEqualTo(testDistributionEntity)
                    assertThat(it.ticketNumber).isEqualTo(updatedTicketNumber)
                },
            )
        }
    }

    @Test
    fun `assign existing ticketnumber to another customer`() {
        val testDistributionEntity = DistributionEntity().apply {
            id = 123
            endedAt = null
            households = listOf(
                testDistributionHouseholdEntity1,
            )
        }
        val householdId = 2L
        val ticketNumber = 50

        every { distributionRepository.findFirstByOrderByIdDesc() } returns testDistributionEntity
        every { householdRepository.findByHouseholdId(householdId) } returns testHouseholdEntity1

        val exception = assertThrows<ConflictException> {
            service.assignHouseholdToDistribution(
                householdId = householdId,
                ticketNumber = ticketNumber,
            )
        }
        assertThat(exception.body.detail).isEqualTo("Ticketnummer $ticketNumber bereits vergeben!")
    }

    @Test
    fun `generate customerlist pdf - successful`() {
        val date = LocalDateTime.now()
        val testDistributionEntity = DistributionEntity().apply {
            id = 123
            startedAt = date
            endedAt = null
        }
        every { distributionRepository.findFirstByOrderByIdDesc() } returns testDistributionEntity
        every { distributionHouseholdRepository.findByDistributionId(123) } returns listOf(
            testDistributionHouseholdEntity1,
            testDistributionHouseholdEntity2,
            testDistributionHouseholdEntity3,
        )

        val bytes = ByteArray(0)
        every { pdfService.generatePdf(any(), any()) } returns bytes

        val result = service.generateHouseholdListPdf()

        val expectedFormattedDate = DateTimeFormatter.ofPattern("dd.MM.yyyy").format(date)
        assertThat(result?.filename).isEqualTo("kundenliste-ausgabe-$expectedFormattedDate.pdf")
        assertThat(result?.bytes).isEqualTo(bytes)

        val householdListPdfModelSlot = slot<HouseholdListPdfModel>()
        verify {
            pdfService.generatePdf(
                capture(householdListPdfModelSlot),
                withArg {
                    assertThat(it).isEqualTo("/pdf-templates/distribution-customerlist/customerlist.xsl")
                },
            )
        }

        val pdfModel = householdListPdfModelSlot.captured
        assertThat(pdfModel).isEqualTo(
            HouseholdListPdfModel(
                title = "Kundenliste zur Ausgabe vom $expectedFormattedDate",
                halftimeTicketNumber = 51,
                countHouseholdsOverall = 3,
                countPersonsOverall = 4,
                households = listOf(
                    HouseholdListItem(
                        ticketNumber = 50,
                        householdId = 100,
                        countPersons = 2,
                        countInfants = 1,
                    ),
                    HouseholdListItem(
                        ticketNumber = 51,
                        householdId = 200,
                        countPersons = 1,
                        countInfants = 0,
                    ),
                    HouseholdListItem(
                        ticketNumber = 52,
                        householdId = 300,
                        countPersons = 1,
                        countInfants = 0,
                    ),
                ),
            ),
        )
    }

    @Test
    fun `get current ticketNumber without registered customers`() {
        val activeDistribution = testDistributionEntity.apply { endedAt = null }
        every { distributionRepository.findFirstByOrderByIdDesc() } returns activeDistribution

        val ticket = service.getCurrentTicketNumber()

        assertThat(ticket).isNull()
    }

    @Test
    fun `get current ticketNumber with open tickets left`() {
        val testDistributionEntity = DistributionEntity().apply {
            id = 123
            endedAt = null
            households = listOf(
                testDistributionHouseholdEntity1,
                testDistributionHouseholdEntity2,
            )
        }
        every { distributionRepository.findFirstByOrderByIdDesc() } returns testDistributionEntity

        val distributionHouseholdEntity = service.getCurrentTicketNumber()

        assertThat(distributionHouseholdEntity?.ticketNumber).isEqualTo(51)
    }

    @Test
    fun `get current ticket-screen ticket maps householdId and pending cost contribution`() {
        val testDistributionHouseholdEntity = DistributionHouseholdEntity().apply {
            id = 1
            createdAt = LocalDateTime.now()
            distribution = testDistributionEntity
            household = HouseholdEntity().apply {
                id = 1
                householdId = 500
                pendingCostContribution = BigDecimal("42.00")
            }
            ticketNumber = 5
            processed = false
        }

        val testDistributionEntity = DistributionEntity().apply {
            id = 123
            endedAt = null
            households = listOf(testDistributionHouseholdEntity)
        }
        every { distributionRepository.findFirstByOrderByIdDesc() } returns testDistributionEntity

        val ticket = service.getCurrentTicketScreenTicket()

        assertThat(ticket.ticketNumber).isEqualTo(5)
        assertThat(ticket.householdId).isEqualTo(500)
        assertThat(ticket.pendingCostContribution).isEqualTo(BigDecimal("42.00"))
    }

    @Test
    fun `get current ticket-screen ticket without active distribution`() {
        every { distributionRepository.findFirstByOrderByIdDesc() } returns null

        val ticket = service.getCurrentTicketScreenTicket()

        assertThat(ticket).isEqualTo(TicketScreenTicketResponse(ticketNumber = null, householdId = null, pendingCostContribution = null))
    }

    @Test
    fun `get current ticketNumber value with open tickets left`() {
        val testDistributionEntity = DistributionEntity().apply {
            id = 123
            endedAt = null
            households = listOf(
                testDistributionHouseholdEntity1,
                testDistributionHouseholdEntity2,
            )
        }
        every { distributionRepository.findFirstByOrderByIdDesc() } returns testDistributionEntity

        val ticketNumber = service.getCurrentTicketNumberValue()

        assertThat(ticketNumber).isEqualTo(51)
    }

    @Test
    fun `get current ticketNumber for customer`() {
        val testDistributionEntity = DistributionEntity().apply {
            id = 123
            endedAt = null
            households = listOf(
                testDistributionHouseholdEntity1,
                testDistributionHouseholdEntity2,
            )
        }
        every { distributionRepository.findFirstByOrderByIdDesc() } returns testDistributionEntity

        val distributionHouseholdEntity = service.getCurrentTicketNumber(
            testDistributionHouseholdEntity2.household!!.householdId,
        )

        assertThat(distributionHouseholdEntity?.ticketNumber).isEqualTo(51)
    }

    @Test
    fun `get current ticketNumber with all tickets resolved`() {
        val testDistributionHouseholdEntity1 = DistributionHouseholdEntity().apply {
            id = 1
            createdAt = LocalDateTime.now()
            distribution = testDistributionEntity
            household = testHouseholdEntity1
            ticketNumber = 1
            processed = true
        }

        val testDistributionEntity = DistributionEntity().apply {
            id = 123
            endedAt = null
            households = listOf(
                testDistributionHouseholdEntity1,
            )
        }
        every { distributionRepository.findFirstByOrderByIdDesc() } returns testDistributionEntity

        val ticket = service.getCurrentTicketNumber()

        assertThat(ticket).isNull()
    }

    @Test
    fun `reopen ticket and previous one without registered customers`() {
        val activeDistribution = testDistributionEntity.apply { endedAt = null }
        every { distributionRepository.findFirstByOrderByIdDesc() } returns activeDistribution

        val ticket = service.reopenAndGetPreviousTicket()

        assertThat(ticket.ticketNumber).isNull()
    }

    @Test
    fun `reopen ticket and previous with open tickets before`() {
        every { distributionHouseholdRepository.save(any()) } returns mockk<DistributionHouseholdEntity>()

        val testDistributionHouseholdEntity1 = DistributionHouseholdEntity().apply {
            id = 1
            createdAt = LocalDateTime.now()
            distribution = testDistributionEntity
            household = testHouseholdEntity1
            ticketNumber = 1
            costContributionPaid = true
            processed = true
        }

        val testDistributionHouseholdEntity2 = DistributionHouseholdEntity().apply {
            id = 2
            createdAt = LocalDateTime.now()
            distribution = testDistributionEntity
            household = testHouseholdEntity2
            ticketNumber = 2
            processed = false
        }

        val testDistributionEntity = DistributionEntity().apply {
            id = 123
            endedAt = null
            households = listOf(
                testDistributionHouseholdEntity1,
                testDistributionHouseholdEntity2,
            )
        }
        every { distributionRepository.findFirstByOrderByIdDesc() } returns testDistributionEntity

        val ticket = service.reopenAndGetPreviousTicket()

        assertThat(ticket?.ticketNumber).isEqualTo(1)
        verify {
            distributionHouseholdRepository.save(
                withArg {
                    assertThat(it.costContributionPaid).isTrue()
                    assertThat(it.processed).isFalse()
                },
            )
        }
    }

    @Test
    fun `reopen ticket and previous without open tickets before`() {
        every { distributionHouseholdRepository.save(any()) } returns mockk<DistributionHouseholdEntity>()

        val testDistributionHouseholdEntity1 = DistributionHouseholdEntity().apply {
            id = 1
            createdAt = LocalDateTime.now()
            distribution = testDistributionEntity
            household = testHouseholdEntity1
            ticketNumber = 1
            processed = false
        }

        val testDistributionHouseholdEntity2 = DistributionHouseholdEntity().apply {
            id = 2
            createdAt = LocalDateTime.now()
            distribution = testDistributionEntity
            household = testHouseholdEntity2
            ticketNumber = 2
            processed = false
        }

        val testDistributionEntity = DistributionEntity().apply {
            id = 123
            endedAt = null
            households = listOf(
                testDistributionHouseholdEntity1,
                testDistributionHouseholdEntity2,
            )
        }
        every { distributionRepository.findFirstByOrderByIdDesc() } returns testDistributionEntity

        val ticket = service.reopenAndGetPreviousTicket()

        assertThat(ticket?.ticketNumber).isEqualTo(1)
        verify(exactly = 0) {
            distributionHouseholdRepository.save(any())
        }
    }

    @Test
    fun `close current ticket and next without registered customers`() {
        val activeDistribution = testDistributionEntity.apply { endedAt = null }
        every { distributionRepository.findFirstByOrderByIdDesc() } returns activeDistribution

        val ticket = service.closeCurrentTicketAndGetNext(
            costContributionPaid = false,
        )

        assertThat(ticket.ticketNumber).isNull()
    }

    @Test
    fun `close current ticket and next with open tickets left`() {
        every { distributionHouseholdRepository.save(any()) } returns mockk<DistributionHouseholdEntity>()

        val testDistributionHouseholdEntity1 = DistributionHouseholdEntity().apply {
            id = 1
            createdAt = LocalDateTime.now()
            distribution = testDistributionEntity
            household = testHouseholdEntity1
            ticketNumber = 1
            costContributionPaid = false
            processed = false
        }

        val testDistributionHouseholdEntity2 = DistributionHouseholdEntity().apply {
            id = 2
            createdAt = LocalDateTime.now()
            distribution = testDistributionEntity
            household = testHouseholdEntity2
            ticketNumber = 2
            costContributionPaid = false
            processed = false
        }

        val testDistributionEntity = DistributionEntity().apply {
            id = 123
            endedAt = null
            households = listOf(
                testDistributionHouseholdEntity1,
                testDistributionHouseholdEntity2,
            )
        }
        every { distributionRepository.findFirstByOrderByIdDesc() } returns testDistributionEntity

        val ticket = service.closeCurrentTicketAndGetNext(
            costContributionPaid = true,
        )

        assertThat(ticket?.ticketNumber).isEqualTo(2)
        verify {
            distributionHouseholdRepository.save(
                withArg {
                    assertThat(it.costContributionPaid).isTrue()
                    assertThat(it.processed).isTrue()
                },
            )
        }
    }

    @Test
    fun `close current ticket and next with all tickets resolved`() {
        val testDistributionHouseholdEntity1 = DistributionHouseholdEntity().apply {
            id = 1
            createdAt = LocalDateTime.now()
            distribution = testDistributionEntity
            household = testHouseholdEntity1
            ticketNumber = 1
            processed = true
        }

        val testDistributionEntity = DistributionEntity().apply {
            id = 123
            endedAt = null
            households = listOf(
                testDistributionHouseholdEntity1,
            )
        }
        every { distributionRepository.findFirstByOrderByIdDesc() } returns testDistributionEntity

        val ticket = service.closeCurrentTicketAndGetNext(false)

        assertThat(ticket.ticketNumber).isNull()
    }

    @Test
    fun `delete current ticket of customer`() {
        val testDistributionEntity = DistributionEntity().apply {
            id = 123
            endedAt = null
            households = listOf(
                testDistributionHouseholdEntity1,
                testDistributionHouseholdEntity2,
            )
        }
        every { distributionRepository.findFirstByOrderByIdDesc() } returns testDistributionEntity

        val result =
            service.deleteCurrentTicket(testDistributionHouseholdEntity2.household!!.householdId!!)

        assertThat(result).isTrue()
        verify(exactly = 1) { distributionHouseholdRepository.delete(testDistributionHouseholdEntity2) }
    }

    @Test
    fun `update statistic data of distribution`() {
        val updatedEmployeeCount = 100
        val selectedShelters = listOf(testShelter1, testShelter2)
        val selectedShelterIds = selectedShelters.mapNotNull { it.id }

        val testDistributionEntity = DistributionEntity().apply {
            endedAt = null
            statistic = DistributionStatisticEntity().apply {
                employeeCount = 1
            }
        }
        every { distributionRepository.findFirstByOrderByIdDesc() } returns testDistributionEntity
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
        assertThat(firstShelter.sortOrder).isEqualTo(testShelter1.sortOrder)

        val secondShelter = updatedDistributionEntity.statistic!!.shelters[1]
        assertThat(secondShelter).isNotNull
        assertThat(secondShelter.sortOrder).isEqualTo(testShelter2.sortOrder)
    }

    @Test
    fun `update notes data of distribution`() {
        val notes = "  test notes, easy peasy  "

        val testDistributionEntity = DistributionEntity().apply { endedAt = null }
        every { distributionRepository.findFirstByOrderByIdDesc() } returns testDistributionEntity
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

        val testDistributionEntity = DistributionEntity().apply { endedAt = null }
        every { distributionRepository.findFirstByOrderByIdDesc() } returns testDistributionEntity
        every { distributionRepository.save(any()) } returns mockk()

        service.updateDistributionNoteData(notes)

        val updatedDistributionEntitySlot = slot<DistributionEntity>()
        verify(exactly = 1) { distributionRepository.save(capture(updatedDistributionEntitySlot)) }

        val updatedDistributionEntity = updatedDistributionEntitySlot.captured
        assertThat(updatedDistributionEntity.notes).isNull()
    }

    @Test
    fun `generate customerlist pdf - compare`() {
        val pdfModel = HouseholdListPdfModel(
            title = "Kundenliste zur Ausgabe vom 01.01.2026",
            halftimeTicketNumber = 51,
            countHouseholdsOverall = 3,
            countPersonsOverall = 4,
            households = listOf(
                HouseholdListItem(ticketNumber = 50, householdId = 100, countPersons = 2, countInfants = 1),
                HouseholdListItem(ticketNumber = 51, householdId = 200, countPersons = 1, countInfants = 0),
                HouseholdListItem(ticketNumber = 52, householdId = 300, countPersons = 1, countInfants = 0),
            ),
        )

        val pdfBytes = PDFService().generatePdf(pdfModel, "/pdf-templates/distribution-customerlist/customerlist.xsl")
        FileUtils.writeByteArrayToFile(File(comparisonResultDirectory, "customerlist-result.pdf"), pdfBytes)

        val document = Loader.loadPDF(pdfBytes)
        val pdfRenderer = PDFRenderer(document)

        assertThat(document.numberOfPages).isEqualTo(1)

        val expectedImage = ImageIO.read(javaClass.getResourceAsStream("$CUSTOMER_LIST_REFERENCES_PATH/customerlist-actual.png"))
        ImageIO.write(expectedImage, "png", File(comparisonResultDirectory, "customerlist-expected.png"))
        val actualImage = pdfRenderer.renderImageWithDPI(0, 300f, ImageType.RGB)
        ImageIO.write(actualImage, "png", File(comparisonResultDirectory, "customerlist-actual.png"))

        // The "Seite X von Y" footer (bottom-right, driven by fo:page-number-citation-last) renders
        // at a small font size and its anti-aliasing differs slightly by OS font rasterizer, even with
        // an embedded font - unlike the rest of the page, which renders pixel-identical across OSes.
        val footerExclusionArea = Rectangle(0, actualImage.height - 120, actualImage.width, actualImage.height)
        val comparisonResult = ImageComparison(expectedImage, actualImage)
            .setExcludedAreas(listOf(footerExclusionArea))
            .compareImages()
        comparisonResult.writeResultTo(File(comparisonResultDirectory, "customerlist-diff.png"))

        assertThat(comparisonResult.imageComparisonState).isEqualTo(ImageComparisonState.MATCH)

        document.close()
    }

    @Test
    fun `send mails`() {
        every { distributionRepository.findByIdOrNull(testDistributionEntity.id!!) } returns testDistributionEntity

        service.sendMails(testDistributionEntity.id!!)

        verify { eventPublisher.publishEvent(DistributionClosedEvent(testDistributionEntity.id!!)) }
    }

    @Test
    fun `send mails with invalid distribution`() {
        every { distributionRepository.findByIdOrNull(testDistributionEntity.id!!) } returns null

        val exception = assertThrows<NotFoundException> { service.sendMails(testDistributionEntity.id!!) }
        assertThat(exception.body.detail).isEqualTo("Ausgabe nicht gefunden!")
    }

    @Test
    fun `send mails forwards the error when publishing fails`() {
        every { distributionRepository.findByIdOrNull(testDistributionEntity.id!!) } returns testDistributionEntity
        every { eventPublisher.publishEvent(any<DistributionClosedEvent>()) } throws IllegalStateException("Test exception")

        val exception = assertThrows<IllegalStateException> { service.sendMails(testDistributionEntity.id!!) }
        assertThat(exception.message).isEqualTo("Test exception")
    }
}
