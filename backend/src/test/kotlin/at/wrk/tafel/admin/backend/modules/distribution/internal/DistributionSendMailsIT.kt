package at.wrk.tafel.admin.backend.modules.distribution.internal

import at.wrk.tafel.admin.backend.TafelBaseIntegrationTest
import at.wrk.tafel.admin.backend.common.test.TestdataGenerator.createCountry
import at.wrk.tafel.admin.backend.common.test.TestdataGenerator.createDistribution
import at.wrk.tafel.admin.backend.common.test.TestdataGenerator.createHousehold
import at.wrk.tafel.admin.backend.common.test.TestdataGenerator.createUser
import at.wrk.tafel.admin.backend.database.common.mailoutbox.MailOutboxRepository
import at.wrk.tafel.admin.backend.database.model.auth.UserEntity
import at.wrk.tafel.admin.backend.database.model.auth.UserRepository
import at.wrk.tafel.admin.backend.database.model.distribution.DistributionHouseholdEntity
import at.wrk.tafel.admin.backend.database.model.distribution.DistributionHouseholdRepository
import at.wrk.tafel.admin.backend.database.model.distribution.DistributionRepository
import at.wrk.tafel.admin.backend.database.model.distribution.DistributionStatisticEntity
import at.wrk.tafel.admin.backend.database.model.household.HouseholdRepository
import at.wrk.tafel.admin.backend.database.model.staticdata.CountryEntity
import at.wrk.tafel.admin.backend.database.model.staticdata.CountryRepository
import com.fasterxml.jackson.annotation.JsonIgnoreProperties
import com.fasterxml.jackson.annotation.JsonProperty
import org.assertj.core.api.Assertions.assertThat
import org.awaitility.Awaitility.await
import org.junit.jupiter.api.AfterEach
import org.junit.jupiter.api.BeforeEach
import org.junit.jupiter.api.Test
import org.springframework.beans.factory.annotation.Autowired
import org.springframework.test.context.DynamicPropertyRegistry
import org.springframework.test.context.DynamicPropertySource
import org.springframework.transaction.support.TransactionTemplate
import org.springframework.web.client.RestClient
import org.testcontainers.containers.GenericContainer
import org.testcontainers.utility.DockerImageName
import java.time.Duration
import java.time.format.DateTimeFormatter

private const val MAILPIT_SMTP_PORT = 1025
private const val MAILPIT_HTTP_PORT = 8025
private const val TEST_RECIPIENT_ADDRESS = "recipient@example.com"

// GenericContainer's SELF-referencing generic bound can't be satisfied with a raw type argument in
// Kotlin (no diamond operator), so a trivial named subclass is required to instantiate it directly.
private class MailpitContainer(image: DockerImageName) : GenericContainer<MailpitContainer>(image)

/**
 * The whole path from "send the mails for this distribution" to a mail sitting in a mail server:
 * `reporting`'s listener composes each mail, `mail_outbox` holds it, and `MailOutboxService`'s poller
 * delivers it.
 *
 * Deliberately **not** `@Transactional`, and this is the point of the test rather than a detail.
 * A test-managed transaction wraps the call in a read-write transaction of the *test's* making, which
 * hides two failures that both bite in production and neither of which is visible in a unit test:
 * - [DistributionService.sendMails] and the listener would participate in it instead of opening the
 *   transactions they really open, so a read-only one on either (which is what broke queuing: Postgres
 *   refuses `mail_outbox_seq`'s `nextval()`) would never be exercised.
 * - The queued rows would be rolled back at the end of the test and the poller, on its own connection,
 *   could never see them - no mail would be sent no matter what the code did.
 *
 * So every fixture here is committed for real, and cleaned up afterwards.
 */
class DistributionSendMailsIT : TafelBaseIntegrationTest() {

    companion object {
        // Self-provisioned like postgreSQLContainer in TafelBaseIntegrationTest - neither CI nor
        // `gradlew :backend:test` run docker-compose, so Mailpit is not available otherwise.
        private val mailpitContainer = MailpitContainer(DockerImageName.parse("axllent/mailpit:latest"))
            .withExposedPorts(MAILPIT_SMTP_PORT, MAILPIT_HTTP_PORT)
            .apply { start() }

        @DynamicPropertySource
        @JvmStatic
        fun dynamicMailProperties(registry: DynamicPropertyRegistry) {
            registry.add("spring.mail.host", mailpitContainer::getHost)
            registry.add("spring.mail.port") { mailpitContainer.getMappedPort(MAILPIT_SMTP_PORT) }
            // Only application.yml under src/main/resources sets this (Boot loads a single
            // application.yml from the classpath, and the test one under src/test/resources shadows
            // it), so mail template resolution needs it re-added here for @SpringBootTest.
            registry.add("spring.thymeleaf.prefix") { "classpath:/mail-templates/" }
            registry.add("tafeladmin.mail.from") { "test@example.com" }
            registry.add("tafeladmin.mail.defaultRecipientsBcc[0]") { TEST_RECIPIENT_ADDRESS }
            // The outbox poller is what actually delivers; at its 10s default this test would spend
            // most of its time waiting for the next tick.
            registry.add("tafeladmin.mailOutbox.interval") { "200ms" }
        }
    }

    @Autowired
    private lateinit var transactionTemplate: TransactionTemplate

    @Autowired
    private lateinit var distributionService: DistributionService

    @Autowired
    private lateinit var distributionRepository: DistributionRepository

    @Autowired
    private lateinit var distributionHouseholdRepository: DistributionHouseholdRepository

    @Autowired
    private lateinit var householdRepository: HouseholdRepository

    @Autowired
    private lateinit var userRepository: UserRepository

    @Autowired
    private lateinit var countryRepository: CountryRepository

    @Autowired
    private lateinit var mailOutboxRepository: MailOutboxRepository

    private lateinit var testUser: UserEntity
    private lateinit var testCountry: CountryEntity
    private var distributionId: Long = 0
    private var householdId: Long = 0

    private val mailpitClient = RestClient.builder()
        .baseUrl("http://${mailpitContainer.host}:${mailpitContainer.getMappedPort(MAILPIT_HTTP_PORT)}")
        .build()

    @BeforeEach
    fun beforeEach() {
        // The database container is shared by every IT class, so a mail another class queued and
        // never sent is still PENDING - and this class is the one that configures a mail server and
        // a fast poller, so it would deliver that mail and count it as one of its own. Drained
        // before the mail server is emptied, so nothing can arrive in between.
        transactionTemplate.executeWithoutResult { mailOutboxRepository.deleteAll() }
        mailpitClient.delete().uri("/api/v1/messages").retrieve().toBodilessEntity()

        testUser = transactionTemplate.execute { userRepository.saveAndFlush(createUser()) }!!
        // `static_countries.code` is unique and the generator always produces "00", so the country is
        // created once and reused - these tests commit, unlike the rollback-per-test ones.
        testCountry = transactionTemplate.execute {
            countryRepository.findAll().firstOrNull() ?: countryRepository.saveAndFlush(createCountry())
        }!!

        transactionTemplate.executeWithoutResult {
            val household = householdRepository.saveAndFlush(createHousehold(testUser.employee!!, testCountry))
            household.mainPerson = household.persons.first { it.isMainPerson }
            householdRepository.saveAndFlush(household)
            householdId = household.id!!

            val distribution = distributionRepository.saveAndFlush(createDistribution(testUser))
            distribution.statistic = DistributionStatisticEntity(distribution = distribution)
            distributionRepository.saveAndFlush(distribution)
            distributionId = distribution.id!!

            distributionHouseholdRepository.saveAndFlush(
                DistributionHouseholdEntity(
                    distribution = distribution,
                    household = household,
                    ticketNumber = 1,
                    processed = false,
                ),
            )
        }
    }

    @AfterEach
    fun afterEach() {
        transactionTemplate.executeWithoutResult {
            distributionHouseholdRepository.deleteAll(distributionHouseholdRepository.findAll().filter { it.distribution.id == distributionId })
            // The statistic is cascaded from the distribution; the household is not.
            distributionRepository.findById(distributionId).ifPresent { distributionRepository.delete(it) }
            householdRepository.findById(householdId).ifPresent { household ->
                household.mainPerson = null
                householdRepository.saveAndFlush(household)
                householdRepository.delete(household)
            }
            userRepository.deleteById(testUser.id!!)
            mailOutboxRepository.deleteAll()
        }
    }

    @Test
    fun `sendMails queues daily report, return boxes and statistics mails and the outbox delivers them`() {
        val distribution = transactionTemplate.execute { distributionRepository.findById(distributionId).get() }!!

        distributionService.sendMails(distributionId)

        val dateFormatted = distribution.startedAt.format(DateTimeFormatter.ofPattern("dd.MM.yyyy"))
        val expectedSubjects = setOf(
            "TÖ Tafel 1030 - Tagesreport vom $dateFormatted",
            "TÖ Tafel 1030 - Retourkisten vom $dateFormatted",
            "TÖ Tafel 1030 - Statistiken vom $dateFormatted",
        )

        await().atMost(Duration.ofSeconds(30)).untilAsserted {
            val response = mailpitClient.get()
                .uri("/api/v1/messages")
                .retrieve()
                .body(MailpitMessagesResponse::class.java)!!

            assertThat(response.total).isEqualTo(3)
            assertThat(response.messages.map { it.subject }).containsExactlyInAnyOrderElementsOf(expectedSubjects)
            response.messages.forEach { message ->
                assertThat(message.bcc.map { it.address }).contains(TEST_RECIPIENT_ADDRESS)
            }
        }
    }
}

@JsonIgnoreProperties(ignoreUnknown = true)
private data class MailpitMessagesResponse(
    val messages: List<MailpitMessageSummary> = emptyList(),
    val total: Int = 0,
)

@JsonIgnoreProperties(ignoreUnknown = true)
private data class MailpitMessageSummary(
    @param:JsonProperty("Subject")
    val subject: String = "",
    @param:JsonProperty("Bcc")
    val bcc: List<MailpitAddress> = emptyList(),
)

@JsonIgnoreProperties(ignoreUnknown = true)
private data class MailpitAddress(
    @param:JsonProperty("Address")
    val address: String = "",
)
