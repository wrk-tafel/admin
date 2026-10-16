package at.wrk.tafel.admin.backend.common.auth

import at.wrk.tafel.admin.backend.TafelBaseIntegrationTest
import at.wrk.tafel.admin.backend.common.auth.components.MfaService
import at.wrk.tafel.admin.backend.common.auth.components.TafelSessionAttributes
import at.wrk.tafel.admin.backend.common.auth.model.UserPermissions
import at.wrk.tafel.admin.backend.common.test.TestdataGenerator.createUser
import at.wrk.tafel.admin.backend.config.properties.TafelAdminMailProperties
import at.wrk.tafel.admin.backend.config.properties.TafelAdminProperties
import at.wrk.tafel.admin.backend.database.model.audit.AuditLogRepository
import at.wrk.tafel.admin.backend.database.model.auth.LoginAttemptRepository
import at.wrk.tafel.admin.backend.database.model.auth.UserAuthorityEntity
import at.wrk.tafel.admin.backend.database.model.auth.UserEntity
import at.wrk.tafel.admin.backend.database.model.auth.UserPasskeyRepository
import at.wrk.tafel.admin.backend.database.model.auth.UserRepository
import org.assertj.core.api.Assertions.assertThat
import org.junit.jupiter.api.AfterEach
import org.junit.jupiter.api.BeforeEach
import org.junit.jupiter.api.Test
import org.springframework.beans.factory.annotation.Autowired
import org.springframework.boot.test.context.SpringBootTest
import org.springframework.boot.test.web.server.LocalServerPort
import org.springframework.http.HttpStatus
import org.springframework.security.crypto.password.PasswordEncoder
import org.springframework.test.context.ActiveProfiles
import org.springframework.transaction.support.TransactionTemplate
import tools.jackson.databind.json.JsonMapper
import java.net.URI
import java.net.http.HttpClient
import java.net.http.HttpRequest
import java.net.http.HttpResponse
import java.time.Duration
import java.util.Base64

/**
 * Passkeys end to end (ADR-0074) - a real database, the real security filter chain, real cookies, and a
 * software authenticator ([TestPasskeyAuthenticator]) producing real keys and signatures. Only this shows that
 * what the backend hands out as options is something an authenticator can answer, and that what comes back
 * passes the verification.
 *
 * The user's code method is the e-mailed code, fixed to [emailCode] here: unlike an app code it can be asked
 * for as often as a test needs one.
 *
 * The annotation is deliberately the same as `MfaIT`'s, so both share one application context: every further
 * context is another connection pool against the one test database, and that database has a connection limit.
 * The site the passkeys belong to is the one the requests go to - `localhost` on the test's own port.
 */
@SpringBootTest(
    webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT,
    properties = ["spring.thymeleaf.prefix=classpath:/mail-templates/", "tafeladmin.mfa.emailCodeForTests=424242"],
)
@ActiveProfiles("test")
class PasskeyIT : TafelBaseIntegrationTest() {

    @LocalServerPort
    private var port: Int = 0

    @Autowired
    private lateinit var userRepository: UserRepository

    @Autowired
    private lateinit var userPasskeyRepository: UserPasskeyRepository

    @Autowired
    private lateinit var auditLogRepository: AuditLogRepository

    @Autowired
    private lateinit var loginAttemptRepository: LoginAttemptRepository

    @Autowired
    private lateinit var mfaService: MfaService

    @Autowired
    private lateinit var transactionTemplate: TransactionTemplate

    @Autowired
    private lateinit var passwordEncoder: PasswordEncoder

    @Autowired
    private lateinit var tafelAdminProperties: TafelAdminProperties

    private var previousMail: TafelAdminMailProperties? = null
    private var previousCooldown: Duration = Duration.ZERO

    private val httpClient = HttpClient.newHttpClient()
    private val jsonMapper = JsonMapper()
    private val password = "aNewSecretPassword1"
    private val emailCode = "424242"

    private lateinit var user: UserEntity
    private val authenticator by lazy { TestPasskeyAuthenticator(origin = "http://localhost:$port") }

    @BeforeEach
    fun beforeEach() {
        // the e-mail method needs a mail to be sendable, and no cooldown so that a test can ask again
        previousMail = tafelAdminProperties.mail
        previousCooldown = tafelAdminProperties.mfa.emailCodeCooldown
        tafelAdminProperties.mail = TafelAdminMailProperties().apply { from = "noreply@example.org" }
        tafelAdminProperties.mfa.emailCodeCooldown = Duration.ZERO

        val encodedPassword = passwordEncoder.encode(password)!!
        user = transactionTemplate.execute {
            val created = userRepository.saveAndFlush(
                createUser().apply {
                    this.password = encodedPassword
                    email = "passkey-user@example.org"
                },
            )
            created.authorities.add(UserAuthorityEntity(user = created, name = UserPermissions.CHECKIN.key))
            userRepository.saveAndFlush(created)
        }!!
    }

    @AfterEach
    fun afterEach() {
        tafelAdminProperties.mail = previousMail
        tafelAdminProperties.mfa.emailCodeCooldown = previousCooldown
        transactionTemplate.execute { userRepository.deleteById(user.id!!) }
    }

    @Test
    fun `a passkey completes a login instead of a code`() {
        switchOnEmail()
        val session = addPasskey(completedSession(), "Mein Laptop")

        val status = get("/api/mfa", session).body()
        assertThat(status).contains(""""name":"Mein Laptop"""").contains(""""kind":"DEVICE"""")

        val login = login()
        assertThat(login.body).contains("PASSKEY")
        // the password-only session is as stuck as ever ...
        assertThat(get("/api/users/export", login.cookie).statusCode()).isEqualTo(HttpStatus.FORBIDDEN.value())

        // ... until the passkey answers the challenge
        val verify = post("/api/mfa/passkey/verify", credentialBody(authenticator.get(passkeyOptions(login.cookie))), login.cookie)
        assertThat(verify.statusCode()).isEqualTo(HttpStatus.NO_CONTENT.value())
        val full = cookieOf(verify)

        assertThat(get("/api/users/info", full).body()).contains(""""mfaPending":false""").contains("CHECKIN")
        assertThat(get("/api/users/export", full).statusCode()).isEqualTo(HttpStatus.OK.value())
        assertThat(userPasskeyRepository.findAllByUserIdOrderByCreatedAtAsc(user.id!!).single().lastUsedAt).isNotNull()
    }

    @Test
    fun `adding a passkey is recorded in the audit trail without the key`() {
        switchOnEmail()
        addPasskey(completedSession(), "Mein Laptop")

        val entry = auditLogRepository.findAll().single { it.entityType == "UserPasskey" && it.businessKey == user.username }
        assertThat(entry.changedFields).contains("Mein Laptop").contains("attestedCredentialData").doesNotContain(
            Base64.getEncoder().encodeToString(userPasskeyRepository.findAllByUserIdOrderByCreatedAtAsc(user.id!!).single().attestedCredentialData),
        )
    }

    @Test
    fun `a passkey can be the first and only method, and then completes the login on its own`() {
        val session = login().cookie

        val credential = authenticator.create(setupOptions(session))
        assertThat(post("/api/mfa/passkey/enable", enableBody(credential, "Mein Laptop"), session).statusCode())
            .isEqualTo(HttpStatus.NO_CONTENT.value())

        val login = login()
        assertThat(login.body).contains(""""mfaRequired":true""").contains("PASSKEY")
        assertThat(get("/api/users/export", login.cookie).statusCode()).isEqualTo(HttpStatus.FORBIDDEN.value())
        // there is no code that would do
        assertThat(post("/api/mfa/verify", """{"code":"$emailCode"}""", login.cookie).statusCode()).isEqualTo(HttpStatus.BAD_REQUEST.value())

        assertThat(get("/api/users/export", passkeySession()).statusCode()).isEqualTo(HttpStatus.OK.value())
    }

    @Test
    fun `adding a passkey needs a code of a method the user has`() {
        switchOnEmail()
        val session = completedSession()

        val credential = authenticator.create(setupOptions(session))
        val refused = post("/api/mfa/passkey/enable", enableBody(credential, "Mein Laptop", "000000"), session)

        assertThat(refused.statusCode()).isEqualTo(HttpStatus.BAD_REQUEST.value())
        assertThat(userPasskeyRepository.findAllByUserIdOrderByCreatedAtAsc(user.id!!)).isEmpty()
        assertThat(login().body).doesNotContain("PASSKEY")
    }

    @Test
    fun `a passkey created on another site is refused, and the code it came with is not used up`() {
        switchOnEmail()
        val session = completedSession()
        post("/api/mfa/email/send", "", session)

        val foreign = TestPasskeyAuthenticator(origin = "https://tafel.example.org").create(setupOptions(session))
        assertThat(post("/api/mfa/passkey/enable", enableBody(foreign, "Fremd", emailCode), session).statusCode())
            .isEqualTo(HttpStatus.BAD_REQUEST.value())
        assertThat(userPasskeyRepository.findAllByUserIdOrderByCreatedAtAsc(user.id!!)).isEmpty()

        // the same code still adds a passkey from the right site
        val credential = authenticator.create(setupOptions(session))
        assertThat(post("/api/mfa/passkey/enable", enableBody(credential, "Mein Laptop", emailCode), session).statusCode())
            .isEqualTo(HttpStatus.NO_CONTENT.value())
    }

    @Test
    fun `an assertion is good for one login only`() {
        switchOnEmail()
        addPasskey(completedSession(), "Mein Laptop")

        val first = login()
        val assertion = credentialBody(authenticator.get(passkeyOptions(first.cookie)))
        val verify = post("/api/mfa/passkey/verify", assertion, first.cookie)
        assertThat(verify.statusCode()).isEqualTo(HttpStatus.NO_CONTENT.value())

        // replayed on the same login: the password-only session id is gone, and the completed one owes nothing ...
        assertThat(post("/api/mfa/passkey/verify", assertion, first.cookie).statusCode()).isEqualTo(HttpStatus.UNAUTHORIZED.value())
        assertThat(post("/api/mfa/passkey/verify", assertion, cookieOf(verify)).statusCode()).isEqualTo(HttpStatus.BAD_REQUEST.value())
        // ... and on the next one it answers the wrong challenge
        val second = login()
        passkeyOptions(second.cookie)
        assertThat(post("/api/mfa/passkey/verify", assertion, second.cookie).statusCode()).isEqualTo(HttpStatus.BAD_REQUEST.value())
        assertThat(get("/api/users/export", second.cookie).statusCode()).isEqualTo(HttpStatus.FORBIDDEN.value())
    }

    @Test
    fun `an answer that is no assertion completes nothing and counts as a failed attempt`() {
        switchOnEmail()
        addPasskey(completedSession(), "Mein Laptop")

        val login = login()
        passkeyOptions(login.cookie)
        val refused = post("/api/mfa/passkey/verify", credentialBody("""{"id":"AAAA","type":"public-key"}"""), login.cookie)

        assertThat(refused.statusCode()).isEqualTo(HttpStatus.BAD_REQUEST.value())
        assertThat(get("/api/users/export", login.cookie).statusCode()).isEqualTo(HttpStatus.FORBIDDEN.value())
        assertThat(loginAttemptRepository.findByUsername(MfaService.attemptKey(user.username))).isNotNull()
    }

    @Test
    fun `the code method can go while a passkey is left, and the passkey then proves every further change`() {
        switchOnEmail()
        val session = addPasskey(completedSession(), "Mein Laptop")
        val passkeyId = userPasskeyRepository.findAllByUserIdOrderByCreatedAtAsc(user.id!!).single().id

        post("/api/mfa/email/send", "", session)
        assertThat(post("/api/mfa/disable", """{"method":"EMAIL","code":"$emailCode"}""", session).statusCode())
            .isEqualTo(HttpStatus.NO_CONTENT.value())
        assertThat(login().body).contains("PASSKEY").doesNotContain("EMAIL")

        // removing the passkey: nothing and a code are no proof, an answer of the passkey is
        val next = passkeySession()
        assertThat(post("/api/mfa/passkey/$passkeyId/disable", "{}", next).statusCode()).isEqualTo(HttpStatus.BAD_REQUEST.value())
        assertThat(post("/api/mfa/passkey/$passkeyId/disable", """{"code":"$emailCode"}""", next).statusCode())
            .isEqualTo(HttpStatus.BAD_REQUEST.value())
        assertThat(post("/api/mfa/passkey/$passkeyId/disable", credentialBody(authenticator.get(passkeyOptions(next))), next).statusCode())
            .isEqualTo(HttpStatus.NO_CONTENT.value())

        assertThat(userPasskeyRepository.findAllByUserIdOrderByCreatedAtAsc(user.id!!)).isEmpty()
        assertThat(login().body).contains(""""mfaRequired":false""")
    }

    @Test
    fun `an administrator's reset removes the passkeys too`() {
        switchOnEmail()
        addPasskey(completedSession(), "Mein Laptop")

        mfaService.reset(user.id!!)

        assertThat(userPasskeyRepository.findAllByUserIdOrderByCreatedAtAsc(user.id!!)).isEmpty()
        assertThat(login().body).contains(""""mfaRequired":false""").doesNotContain("PASSKEY")
    }

    private fun switchOnEmail() {
        mfaService.startEmailSetup(user.username)
        assertThat(mfaService.enableEmail(user.username, emailCode)).isTrue()
    }

    /** A session that has passed its second step, by the e-mailed code. */
    private fun completedSession(): String {
        val login = login()
        post("/api/mfa/email/send", "", login.cookie)
        return cookieOf(post("/api/mfa/verify", """{"code":"$emailCode"}""", login.cookie))
    }

    /** Adds a passkey and returns the session it is answered with - the id changes, as after every second step. */
    private fun addPasskey(session: String, name: String): String {
        post("/api/mfa/email/send", "", session)
        val credential = authenticator.create(setupOptions(session))
        val enable = post("/api/mfa/passkey/enable", enableBody(credential, name, emailCode), session)
        assertThat(enable.statusCode()).isEqualTo(HttpStatus.NO_CONTENT.value())
        return cookieOf(enable)
    }

    private fun setupOptions(session: String): Map<String, Any?> = optionsOf(post("/api/mfa/passkey/setup", "", session))

    private fun passkeyOptions(session: String): Map<String, Any?> = optionsOf(post("/api/mfa/passkey/options", "", session))

    /** A session that has passed its second step, by a passkey. */
    private fun passkeySession(): String {
        val login = login()
        return cookieOf(post("/api/mfa/passkey/verify", credentialBody(authenticator.get(passkeyOptions(login.cookie))), login.cookie))
    }

    @Suppress("UNCHECKED_CAST")
    private fun optionsOf(response: HttpResponse<String>): Map<String, Any?> {
        assertThat(response.statusCode()).isEqualTo(HttpStatus.OK.value())
        return jsonMapper.readValue(response.body(), Map::class.java)["options"] as Map<String, Any?>
    }

    private fun credentialBody(credentialJson: String) = """{"credential":$credentialJson}"""

    private fun enableBody(credentialJson: String, name: String, code: String? = null) = """{"credential":$credentialJson,"name":"$name","currentCode":${code?.let { "\"$it\"" }}}"""

    private data class Login(val cookie: String, val body: String)

    private fun login(): Login {
        val credentials = Base64.getEncoder().encodeToString("${user.username}:$password".toByteArray())
        val response = httpClient.send(
            HttpRequest.newBuilder(URI.create("http://localhost:$port/api/login"))
                .header("Authorization", "Basic $credentials")
                .POST(HttpRequest.BodyPublishers.noBody())
                .build(),
            HttpResponse.BodyHandlers.ofString(),
        )
        assertThat(response.statusCode()).isEqualTo(HttpStatus.OK.value())
        return Login(cookieOf(response), response.body())
    }

    private fun cookieOf(response: HttpResponse<*>): String = response.headers().allValues("set-cookie")
        .first { it.startsWith("${TafelSessionAttributes.COOKIE_NAME}=") }
        .substringAfter("=").substringBefore(";")

    private fun get(path: String, cookie: String): HttpResponse<String> = httpClient.send(
        HttpRequest.newBuilder(URI.create("http://localhost:$port$path"))
            .header("Cookie", "${TafelSessionAttributes.COOKIE_NAME}=$cookie")
            .GET()
            .build(),
        HttpResponse.BodyHandlers.ofString(),
    )

    /** A state-changing request needs the CSRF token: a cookie that has to come back as the `X-XSRF-TOKEN` header too. */
    private fun post(path: String, json: String, cookie: String): HttpResponse<String> {
        val csrf = get("/api/users/info", cookie).headers().allValues("set-cookie")
            .first { it.startsWith("XSRF-TOKEN=") }
            .substringAfter("=").substringBefore(";")
        return httpClient.send(
            HttpRequest.newBuilder(URI.create("http://localhost:$port$path"))
                .header("Cookie", "${TafelSessionAttributes.COOKIE_NAME}=$cookie; XSRF-TOKEN=$csrf")
                .header("X-XSRF-TOKEN", csrf)
                .header("Content-Type", "application/json")
                .method("POST", HttpRequest.BodyPublishers.ofString(json))
                .build(),
            HttpResponse.BodyHandlers.ofString(),
        )
    }
}
