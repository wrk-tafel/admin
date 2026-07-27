package at.wrk.tafel.admin.backend.modules.distribution.internal

import at.wrk.tafel.admin.backend.TafelBaseIntegrationTest
import at.wrk.tafel.admin.backend.common.test.TestdataGenerator.createCountry
import at.wrk.tafel.admin.backend.common.test.TestdataGenerator.createDistribution
import at.wrk.tafel.admin.backend.common.test.TestdataGenerator.createHousehold
import at.wrk.tafel.admin.backend.common.test.TestdataGenerator.createUser
import at.wrk.tafel.admin.backend.database.model.auth.UserEntity
import at.wrk.tafel.admin.backend.database.model.distribution.DistributionEntity
import at.wrk.tafel.admin.backend.database.model.distribution.DistributionHouseholdEntity
import at.wrk.tafel.admin.backend.database.model.distribution.DistributionStatisticEntity
import at.wrk.tafel.admin.backend.database.model.household.HouseholdEntity
import at.wrk.tafel.admin.backend.database.model.staticdata.CountryEntity
import com.fasterxml.jackson.annotation.JsonIgnoreProperties
import com.fasterxml.jackson.annotation.JsonProperty
import org.assertj.core.api.Assertions.assertThat
import org.awaitility.Awaitility.await
import org.junit.jupiter.api.BeforeEach
import org.junit.jupiter.api.Test
import org.springframework.beans.factory.annotation.Autowired
import org.springframework.boot.jpa.test.autoconfigure.TestEntityManager
import org.springframework.test.context.DynamicPropertyRegistry
import org.springframework.test.context.DynamicPropertySource
import org.springframework.transaction.annotation.Transactional
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
        }
    }

    @Autowired
    private lateinit var testEntityManager: TestEntityManager

    @Autowired
    private lateinit var distributionService: DistributionService

    private lateinit var testUser: UserEntity
    private lateinit var testCountry: CountryEntity

    @BeforeEach
    fun beforeEach() {
        testUser = createUser()
        testEntityManager.persist(testUser)

        testCountry = createCountry()
        testEntityManager.persist(testCountry)
    }

    @Test
    @Transactional
    fun `sendMails sends daily report, return boxes and statistics mails via mailpit`() {
        val distribution = createDistribution(testUser)
        testEntityManager.persist(distribution)

        val statistic = DistributionStatisticEntity().apply { this.distribution = distribution }
        testEntityManager.persist(statistic)

        val household = persistHousehold()
        createDistributionHouseholdEntity(household = household, distribution = distribution, ticketNumber = 1)

        testEntityManager.flush()
        testEntityManager.clear()

        distributionService.sendMails(distribution.id!!)

        val dateFormatted = distribution.startedAt!!.format(DateTimeFormatter.ofPattern("dd.MM.yyyy"))
        val expectedSubjects = setOf(
            "TÖ Tafel 1030 - Tagesreport vom $dateFormatted",
            "TÖ Tafel 1030 - Retourkisten vom $dateFormatted",
            "TÖ Tafel 1030 - Statistiken vom $dateFormatted",
        )

        val mailpitClient = RestClient.builder()
            .baseUrl("http://${mailpitContainer.host}:${mailpitContainer.getMappedPort(MAILPIT_HTTP_PORT)}")
            .build()

        await().atMost(Duration.ofSeconds(10)).untilAsserted {
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

    private fun persistHousehold(): HouseholdEntity {
        val household = createHousehold(testUser.employee!!, testCountry)
        testEntityManager.persist(household)
        testEntityManager.flush()

        household.mainPerson = household.persons.first { it.isMainPerson }
        testEntityManager.persist(household)
        testEntityManager.flush()

        return household
    }

    private fun createDistributionHouseholdEntity(
        household: HouseholdEntity,
        distribution: DistributionEntity,
        ticketNumber: Int,
    ): DistributionHouseholdEntity {
        val distributionHouseholdEntity = DistributionHouseholdEntity()

        distributionHouseholdEntity.household = household
        distributionHouseholdEntity.distribution = distribution
        distributionHouseholdEntity.ticketNumber = ticketNumber
        distributionHouseholdEntity.processed = false

        testEntityManager.persist(distributionHouseholdEntity)
        return distributionHouseholdEntity
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
