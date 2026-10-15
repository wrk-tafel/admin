package at.wrk.tafel.admin.backend.common.auth

import at.wrk.tafel.admin.backend.TafelBaseIntegrationTest
import at.wrk.tafel.admin.backend.common.auth.model.PasswordResetConfirmRequest
import at.wrk.tafel.admin.backend.common.auth.model.PasswordResetRequest
import at.wrk.tafel.admin.backend.common.test.TestdataGenerator.createUser
import at.wrk.tafel.admin.backend.database.common.mailoutbox.MailOutboxRepository
import at.wrk.tafel.admin.backend.database.model.auth.PasswordResetTokenRepository
import at.wrk.tafel.admin.backend.database.model.auth.UserEntity
import at.wrk.tafel.admin.backend.database.model.auth.UserRepository
import com.fasterxml.jackson.annotation.JsonIgnoreProperties
import com.fasterxml.jackson.annotation.JsonProperty
import org.assertj.core.api.Assertions.assertThat
import org.awaitility.Awaitility.await
import org.junit.jupiter.api.AfterEach
import org.junit.jupiter.api.BeforeEach
import org.junit.jupiter.api.Test
import org.springframework.beans.factory.annotation.Autowired
import org.springframework.http.HttpStatus
import org.springframework.security.crypto.password.PasswordEncoder
import org.springframework.test.context.DynamicPropertyRegistry
import org.springframework.test.context.DynamicPropertySource
import org.springframework.transaction.support.TransactionTemplate
import org.springframework.web.client.RestClient
import org.testcontainers.containers.GenericContainer
import org.testcontainers.utility.DockerImageName
import java.time.Duration

private const val MAILPIT_SMTP_PORT = 1025
private const val MAILPIT_HTTP_PORT = 8025

private class PasswordResetMailpitContainer(image: DockerImageName) : GenericContainer<PasswordResetMailpitContainer>(image)

/**
 * "Passwort vergessen?" from the request to the new password, through the real `mail_outbox` and a
 * real mail server: the token only ever exists in the mail, so reading it from there is the only way
 * to prove the link works. Not `@Transactional`, for the reason `DistributionSendMailsIT` gives: the
 * queued mail has to be committed for the poller to see it.
 */
class PasswordResetIT : TafelBaseIntegrationTest() {

    companion object {
        private val mailpitContainer = PasswordResetMailpitContainer(DockerImageName.parse("axllent/mailpit:latest"))
            .withExposedPorts(MAILPIT_SMTP_PORT, MAILPIT_HTTP_PORT)
            .apply { start() }

        @DynamicPropertySource
        @JvmStatic
        fun dynamicMailProperties(registry: DynamicPropertyRegistry) {
            registry.add("spring.mail.host", mailpitContainer::getHost)
            registry.add("spring.mail.port") { mailpitContainer.getMappedPort(MAILPIT_SMTP_PORT) }
            registry.add("spring.thymeleaf.prefix") { "classpath:/mail-templates/" }
            registry.add("tafeladmin.mail.from") { "test@example.com" }
            registry.add("tafeladmin.mailOutbox.interval") { "500ms" }
            registry.add("tafeladmin.server.publicUrl") { "https://tafel.example.org/verwaltung/" }
        }
    }

    @Autowired
    private lateinit var passwordResetController: PasswordResetController

    @Autowired
    private lateinit var userRepository: UserRepository

    @Autowired
    private lateinit var passwordResetTokenRepository: PasswordResetTokenRepository

    @Autowired
    private lateinit var mailOutboxRepository: MailOutboxRepository

    @Autowired
    private lateinit var passwordEncoder: PasswordEncoder

    @Autowired
    private lateinit var transactionTemplate: TransactionTemplate

    private lateinit var user: UserEntity

    private val mailpitClient = RestClient.builder()
        .baseUrl("http://${mailpitContainer.host}:${mailpitContainer.getMappedPort(MAILPIT_HTTP_PORT)}")
        .build()

    @BeforeEach
    fun beforeEach() {
        transactionTemplate.executeWithoutResult { mailOutboxRepository.deleteAllInBatch() }
        mailpitClient.delete().uri("/api/v1/messages").retrieve().toBodilessEntity()
        user = transactionTemplate.execute {
            userRepository.saveAndFlush(createUser().apply { email = "$username@example.org" })
        }!!
    }

    @AfterEach
    fun afterEach() {
        transactionTemplate.executeWithoutResult {
            userRepository.deleteById(user.id!!)
            mailOutboxRepository.deleteAllInBatch()
        }
    }

    @Test
    fun `a mailed link sets a new password once, ends the sessions and is gone afterwards`() {
        val requestResponse = passwordResetController.requestReset(PasswordResetRequest(identifier = user.email!!.uppercase()))
        assertThat(requestResponse.statusCode).isEqualTo(HttpStatus.ACCEPTED)

        val token = awaitTokenFromMail()

        val confirmResponse = passwordResetController.confirmReset(PasswordResetConfirmRequest(token, "aNewSecretPassword-123"))
        assertThat(confirmResponse.statusCode).isEqualTo(HttpStatus.NO_CONTENT)

        val updated = userRepository.findById(user.id!!).get()
        assertThat(passwordEncoder.matches("aNewSecretPassword-123", updated.password)).isTrue()
        assertThat(updated.tokenInvalidatedAt).isNotNull()

        val secondAttempt = passwordResetController.confirmReset(PasswordResetConfirmRequest(token, "anotherSecretPassword-456"))
        assertThat(secondAttempt.statusCode).isEqualTo(HttpStatus.GONE)
        assertThat(passwordEncoder.matches("aNewSecretPassword-123", userRepository.findById(user.id!!).get().password)).isTrue()
    }

    @Test
    fun `a password the policy refuses leaves the link usable`() {
        passwordResetController.requestReset(PasswordResetRequest(identifier = user.username))
        val token = awaitTokenFromMail()

        val refused = passwordResetController.confirmReset(PasswordResetConfirmRequest(token, "short"))
        assertThat(refused.statusCode).isEqualTo(HttpStatus.BAD_REQUEST)
        assertThat(refused.body!!.details).isNotEmpty()

        val accepted = passwordResetController.confirmReset(PasswordResetConfirmRequest(token, "aNewSecretPassword-123"))
        assertThat(accepted.statusCode).isEqualTo(HttpStatus.NO_CONTENT)
    }

    @Test
    fun `an unknown identifier gets the same answer and no token`() {
        val response = passwordResetController.requestReset(PasswordResetRequest(identifier = "nobody-${user.username}"))

        assertThat(response.statusCode).isEqualTo(HttpStatus.ACCEPTED)
        assertThat(passwordResetTokenRepository.findFirstByUserIdOrderByCreatedAtDesc(user.id!!)).isNull()
    }

    private fun awaitTokenFromMail(): String {
        var token: String? = null
        await().atMost(Duration.ofSeconds(30)).untilAsserted {
            val messages = mailpitClient.get().uri("/api/v1/messages").retrieve()
                .body(PasswordResetMailpitMessages::class.java)!!.messages.orEmpty()
            val message = messages.firstOrNull { summary -> summary.to.orEmpty().any { it.address == user.email } }
            assertThat(message).describedAs("mail to %s", user.email).isNotNull()

            val html = mailpitClient.get().uri("/api/v1/message/{id}", message!!.id).retrieve()
                .body(PasswordResetMailpitMessage::class.java)!!.html.orEmpty()
            assertThat(html).contains("https://tafel.example.org/verwaltung/passwort-zuruecksetzen#token=")
            token = Regex("#token=([A-Za-z0-9_-]+)").find(html)!!.groupValues[1]
        }
        return token!!
    }
}

@JsonIgnoreProperties(ignoreUnknown = true)
private data class PasswordResetMailpitMessages(
    val messages: List<PasswordResetMailpitSummary>? = null,
)

@JsonIgnoreProperties(ignoreUnknown = true)
private data class PasswordResetMailpitSummary(
    @param:JsonProperty("ID")
    val id: String? = null,
    @param:JsonProperty("To")
    val to: List<PasswordResetMailpitAddress>? = null,
)

@JsonIgnoreProperties(ignoreUnknown = true)
private data class PasswordResetMailpitAddress(
    @param:JsonProperty("Address")
    val address: String? = null,
)

@JsonIgnoreProperties(ignoreUnknown = true)
private data class PasswordResetMailpitMessage(
    @param:JsonProperty("HTML")
    val html: String? = null,
)
