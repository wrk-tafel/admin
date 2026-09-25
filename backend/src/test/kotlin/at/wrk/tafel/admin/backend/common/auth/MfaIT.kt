package at.wrk.tafel.admin.backend.common.auth

import at.wrk.tafel.admin.backend.TafelBaseIntegrationTest
import at.wrk.tafel.admin.backend.common.auth.components.MfaService
import at.wrk.tafel.admin.backend.common.auth.components.TafelLoginFilter
import at.wrk.tafel.admin.backend.common.auth.components.TotpService
import at.wrk.tafel.admin.backend.common.auth.model.UserPermissions
import at.wrk.tafel.admin.backend.common.test.TestdataGenerator.createUser
import at.wrk.tafel.admin.backend.config.properties.ApplicationProperties
import at.wrk.tafel.admin.backend.config.properties.TafelAdminMailProperties
import at.wrk.tafel.admin.backend.config.properties.TafelAdminProperties
import at.wrk.tafel.admin.backend.database.model.auth.UserAuthorityEntity
import at.wrk.tafel.admin.backend.database.model.auth.UserEntity
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
import org.springframework.transaction.support.TransactionTemplate
import java.net.URI
import java.net.http.HttpClient
import java.net.http.HttpRequest
import java.net.http.HttpResponse
import java.time.Clock
import java.time.Duration
import java.util.Base64

/**
 * Two-factor authentication end to end - a real database, the real security filter chain and real
 * cookies. What a login that still owes its code may do is decided by `TafelJwtAuthProvider` and
 * `MfaPendingFilter` together, and only this shows that a password-only session really is stuck.
 *
 * Each test has its own user: a code is good once, and only the steps around the current one are
 * accepted, so a user can only be asked for a few codes. They are computed for the step before the
 * current one, the current one and the one after, in the order they are used.
 */
@SpringBootTest(
    webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT,
    // the test configuration replaces application.yml, which is where the real template location is set; the
    // fixed code stands in for the mail the e-mail method sends, which nothing here can read
    properties = ["spring.thymeleaf.prefix=classpath:/mail-templates/", "tafeladmin.mfa.emailCodeForTests=424242"],
)
class MfaIT : TafelBaseIntegrationTest() {

    @LocalServerPort
    private var port: Int = 0

    @Autowired
    private lateinit var userRepository: UserRepository

    @Autowired
    private lateinit var mfaService: MfaService

    @Autowired
    private lateinit var totpService: TotpService

    @Autowired
    private lateinit var transactionTemplate: TransactionTemplate

    @Autowired
    private lateinit var passwordEncoder: PasswordEncoder

    @Autowired
    private lateinit var applicationProperties: ApplicationProperties

    @Autowired
    private lateinit var clock: Clock

    @Autowired
    private lateinit var tafelAdminProperties: TafelAdminProperties

    private var previousMail: TafelAdminMailProperties? = null
    private var previousCooldown: Duration = Duration.ZERO

    private val httpClient = HttpClient.newHttpClient()
    private val password = "aNewSecretPassword1"

    private lateinit var user: UserEntity
    private lateinit var secret: String
    private val step: Long get() = clock.instant().epochSecond / TotpService.STEP_SECONDS

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
                    email = "mfa-user@example.org"
                },
            )
            created.authorities.add(UserAuthorityEntity(user = created, name = UserPermissions.CHECKIN.key))
            userRepository.saveAndFlush(created)
        }!!
    }

    @AfterEach
    fun afterEach() {
        setRequired(false)
        tafelAdminProperties.mail = previousMail
        tafelAdminProperties.mfa.emailCodeCooldown = previousCooldown
        transactionTemplate.execute { userRepository.deleteById(user.id!!) }
    }

    private fun setRequired(required: Boolean) {
        tafelAdminProperties.mfa.required = required
    }

    private val emailCode = "424242"

    /** Switches the e-mail method on the way the setup screen does: a code is sent, and entered. */
    private fun switchOnEmail() {
        mfaService.startEmailSetup(user.username)
        assertThat(mfaService.enableEmail(user.username, emailCode)).isTrue()
    }

    /** Switches it on for [user] the way the setup screen does, using the code for the step before this one. */
    private fun switchOn() {
        secret = mfaService.startSetup(user.username).secret
        assertThat(mfaService.enable(user.username, totpService.codeAt(secret, step - 1))).isTrue()
    }

    @Test
    fun `a user without it logs in and works as before`() {
        val login = login()

        assertThat(login.body).contains(""""mfaRequired":false""")
        assertThat(get("/api/users/info", login.jwt).body()).contains(""""mfaPending":false""").contains("CHECKIN")
        assertThat(get("/api/users/export", login.jwt).statusCode()).isEqualTo(HttpStatus.OK.value())
    }

    @Test
    fun `a login by password alone is not enough once it is on, and the code completes it`() {
        switchOn()

        val login = login()
        assertThat(login.body).contains(""""mfaRequired":true""")

        // the password-only session may say who it is - that is how the frontend learns a code is owed ...
        val info = get("/api/users/info", login.jwt).body()
        assertThat(info).contains(""""mfaPending":true""").contains(""""permissions":[]""")
        // ... and nothing else: not what needs a permission, and not what asks only to be signed in
        assertThat(get("/api/households", login.jwt).statusCode()).isEqualTo(HttpStatus.FORBIDDEN.value())
        assertThat(get("/api/users/export", login.jwt).statusCode()).isEqualTo(HttpStatus.FORBIDDEN.value())
        assertThat(get("/api/mfa", login.jwt).statusCode()).isEqualTo(HttpStatus.FORBIDDEN.value())

        val verify = post("/api/mfa/verify", """{"code":"${totpService.codeAt(secret, step)}"}""", login.jwt)
        assertThat(verify.statusCode()).isEqualTo(HttpStatus.NO_CONTENT.value())
        val fullJwt = jwtOf(verify)

        assertThat(get("/api/users/info", fullJwt).body()).contains(""""mfaPending":false""").contains("CHECKIN")
        assertThat(get("/api/users/export", fullJwt).statusCode()).isEqualTo(HttpStatus.OK.value())
        // handing in the code did not upgrade the session it was handed in on
        assertThat(get("/api/users/export", login.jwt).statusCode()).isEqualTo(HttpStatus.FORBIDDEN.value())
    }

    @Test
    fun `a wrong code finishes nothing`() {
        switchOn()
        val login = login()

        val verify = post("/api/mfa/verify", """{"code":"000000"}""", login.jwt)

        assertThat(verify.statusCode()).isEqualTo(HttpStatus.BAD_REQUEST.value())
        assertThat(verify.headers().allValues("set-cookie")).noneMatch { it.startsWith(TafelLoginFilter.jwtCookieName) }
        assertThat(get("/api/users/export", login.jwt).statusCode()).isEqualTo(HttpStatus.FORBIDDEN.value())
    }

    @Test
    fun `a code that was used cannot be used again`() {
        switchOn()
        val code = totpService.codeAt(secret, step)

        val first = login()
        assertThat(post("/api/mfa/verify", """{"code":"$code"}""", first.jwt).statusCode()).isEqualTo(HttpStatus.NO_CONTENT.value())

        val second = login()
        assertThat(post("/api/mfa/verify", """{"code":"$code"}""", second.jwt).statusCode()).isEqualTo(HttpStatus.BAD_REQUEST.value())
        assertThat(get("/api/users/export", second.jwt).statusCode()).isEqualTo(HttpStatus.FORBIDDEN.value())
    }

    @Test
    fun `too many wrong codes lock the code entry, even for the right code`() {
        switchOn()
        val login = login()

        repeat(applicationProperties.security.loginAttempts.maxFailures) {
            assertThat(post("/api/mfa/verify", """{"code":"000000"}""", login.jwt).statusCode()).isEqualTo(HttpStatus.BAD_REQUEST.value())
        }

        val verify = post("/api/mfa/verify", """{"code":"${totpService.codeAt(secret, step)}"}""", login.jwt)
        assertThat(verify.statusCode()).isEqualTo(HttpStatus.BAD_REQUEST.value())
        assertThat(get("/api/users/export", login.jwt).statusCode()).isEqualTo(HttpStatus.FORBIDDEN.value())
    }

    @Test
    fun `switching it on takes effect for the sessions that were open, and the setup's own session goes on`() {
        val before = login()
        assertThat(get("/api/users/export", before.jwt).statusCode()).isEqualTo(HttpStatus.OK.value())

        val setup = post("/api/mfa/setup", "", before.jwt)
        assertThat(setup.statusCode()).isEqualTo(HttpStatus.OK.value())
        secret = Regex(""""secret":"([A-Z2-7]+)"""").find(setup.body())!!.groupValues[1]
        assertThat(setup.body()).contains("otpauth://totp/")

        val enable = post("/api/mfa/enable", """{"code":"${totpService.codeAt(secret, step)}"}""", before.jwt)
        assertThat(enable.statusCode()).isEqualTo(HttpStatus.NO_CONTENT.value())
        val after = jwtOf(enable)

        assertThat(get("/api/users/export", after).statusCode()).isEqualTo(HttpStatus.OK.value())
        assertThat(get("/api/users/export", before.jwt).statusCode()).isEqualTo(HttpStatus.FORBIDDEN.value())
    }

    @Test
    fun `it can be switched off with a code, after which a password is enough again`() {
        switchOn()
        val login = login()
        val full = jwtOf(post("/api/mfa/verify", """{"code":"${totpService.codeAt(secret, step)}"}""", login.jwt))

        val disable = post("/api/mfa/disable", """{"method":"TOTP","code":"${totpService.codeAt(secret, step + 1)}"}""", full)
        assertThat(disable.statusCode()).isEqualTo(HttpStatus.NO_CONTENT.value())

        assertThat(login().body).contains(""""mfaRequired":false""")
        assertThat(userRepository.findById(user.id!!).get().mfaSecret).isNull()
    }

    @Test
    fun `an administrator's reset lets someone who lost the phone in with the password again`() {
        switchOn()
        assertThat(login().body).contains(""""mfaRequired":true""")

        mfaService.reset(user.id!!)

        assertThat(login().body).contains(""""mfaRequired":false""")
    }

    // ---- e-mail

    @Test
    fun `an e-mailed code completes a login for a user who has only that method`() {
        switchOnEmail()

        val login = login()
        assertThat(login.body).contains(""""mfaRequired":true""").contains(""""mfaMethods":["EMAIL"]""")
        assertThat(get("/api/users/export", login.jwt).statusCode()).isEqualTo(HttpStatus.FORBIDDEN.value())

        assertThat(post("/api/mfa/email/send", "", login.jwt).statusCode()).isEqualTo(HttpStatus.ACCEPTED.value())
        val verify = post("/api/mfa/verify", """{"code":"$emailCode"}""", login.jwt)

        assertThat(verify.statusCode()).isEqualTo(HttpStatus.NO_CONTENT.value())
        assertThat(get("/api/users/export", jwtOf(verify)).statusCode()).isEqualTo(HttpStatus.OK.value())
    }

    @Test
    fun `an e-mailed code is good once`() {
        switchOnEmail()

        val first = login()
        post("/api/mfa/email/send", "", first.jwt)
        assertThat(post("/api/mfa/verify", """{"code":"$emailCode"}""", first.jwt).statusCode()).isEqualTo(HttpStatus.NO_CONTENT.value())

        // the code was used up: a second login cannot use it without asking for a new one
        val second = login()
        assertThat(post("/api/mfa/verify", """{"code":"$emailCode"}""", second.jwt).statusCode()).isEqualTo(HttpStatus.BAD_REQUEST.value())
        assertThat(get("/api/users/export", second.jwt).statusCode()).isEqualTo(HttpStatus.FORBIDDEN.value())
    }

    @Test
    fun `a code sent for a login that was never finished cannot complete the next login`() {
        switchOnEmail()

        val abandoned = login()
        assertThat(post("/api/mfa/email/send", "", abandoned.jwt).statusCode()).isEqualTo(HttpStatus.ACCEPTED.value())

        // the next login starts over: the code sent for the earlier one is gone, a new one has to be asked for
        val next = login()
        assertThat(post("/api/mfa/verify", """{"code":"$emailCode"}""", next.jwt).statusCode()).isEqualTo(HttpStatus.BAD_REQUEST.value())

        assertThat(post("/api/mfa/email/send", "", next.jwt).statusCode()).isEqualTo(HttpStatus.ACCEPTED.value())
        assertThat(post("/api/mfa/verify", """{"code":"$emailCode"}""", next.jwt).statusCode()).isEqualTo(HttpStatus.NO_CONTENT.value())
    }

    @Test
    fun `with both methods either one completes the login`() {
        switchOn()
        switchOnEmail()

        val byEmail = login()
        assertThat(byEmail.body).contains(""""mfaMethods":["TOTP","EMAIL"]""")
        post("/api/mfa/email/send", "", byEmail.jwt)
        assertThat(post("/api/mfa/verify", """{"code":"$emailCode"}""", byEmail.jwt).statusCode()).isEqualTo(HttpStatus.NO_CONTENT.value())

        val byApp = login()
        assertThat(post("/api/mfa/verify", """{"code":"${totpService.codeAt(secret, step)}"}""", byApp.jwt).statusCode())
            .isEqualTo(HttpStatus.NO_CONTENT.value())
    }

    @Test
    fun `a login code cannot be sent to a user who has not switched the e-mail method on`() {
        switchOn()
        val login = login()

        val send = post("/api/mfa/email/send", "", login.jwt)

        assertThat(send.statusCode()).isEqualTo(HttpStatus.BAD_REQUEST.value())
    }

    // ---- the deployment requires it

    @Test
    fun `while the deployment requires it, a user with no method can do nothing but set one up`() {
        setRequired(true)

        val login = login()
        assertThat(login.body).contains(""""mfaRequired":false""")
        val info = get("/api/users/info", login.jwt).body()
        assertThat(info).contains(""""mfaSetupRequired":true""").contains(""""permissions":[]""")
        assertThat(get("/api/users/export", login.jwt).statusCode()).isEqualTo(HttpStatus.FORBIDDEN.value())
        assertThat(get("/api/households", login.jwt).statusCode()).isEqualTo(HttpStatus.FORBIDDEN.value())
        // and the setup calls are open
        assertThat(get("/api/mfa", login.jwt).body()).contains(""""required":true""")

        val setup = post("/api/mfa/setup", "", login.jwt)
        assertThat(setup.statusCode()).isEqualTo(HttpStatus.OK.value())
        secret = Regex(""""secret":"([A-Z2-7]+)"""").find(setup.body())!!.groupValues[1]
        val enable = post("/api/mfa/enable", """{"code":"${totpService.codeAt(secret, step)}"}""", login.jwt)

        assertThat(enable.statusCode()).isEqualTo(HttpStatus.NO_CONTENT.value())
        assertThat(get("/api/users/export", jwtOf(enable)).statusCode()).isEqualTo(HttpStatus.OK.value())
    }

    @Test
    fun `the e-mail method can be the one that is set up while it is required`() {
        setRequired(true)
        val login = login()

        assertThat(post("/api/mfa/email/setup", "", login.jwt).statusCode()).isEqualTo(HttpStatus.ACCEPTED.value())
        val enable = post("/api/mfa/email/enable", """{"code":"$emailCode"}""", login.jwt)

        assertThat(enable.statusCode()).isEqualTo(HttpStatus.NO_CONTENT.value())
        assertThat(get("/api/users/export", jwtOf(enable)).statusCode()).isEqualTo(HttpStatus.OK.value())
    }

    @Test
    fun `switching the requirement on reaches a session that was open already`() {
        val session = login()
        assertThat(get("/api/users/export", session.jwt).statusCode()).isEqualTo(HttpStatus.OK.value())

        setRequired(true)

        assertThat(get("/api/users/export", session.jwt).statusCode()).isEqualTo(HttpStatus.FORBIDDEN.value())

        setRequired(false)
        assertThat(get("/api/users/export", session.jwt).statusCode()).isEqualTo(HttpStatus.OK.value())
    }

    @Test
    fun `while it is required the last method cannot be switched off, but one of two can`() {
        switchOn()
        setRequired(true)
        val login = login()
        val full = jwtOf(post("/api/mfa/verify", """{"code":"${totpService.codeAt(secret, step)}"}""", login.jwt))

        val refused = post("/api/mfa/disable", """{"method":"TOTP","code":"${totpService.codeAt(secret, step + 1)}"}""", full)
        assertThat(refused.statusCode()).isEqualTo(HttpStatus.CONFLICT.value())

        switchOnEmail()
        post("/api/mfa/email/send", "", full)
        val allowed = post("/api/mfa/disable", """{"method":"EMAIL","code":"${totpService.codeAt(secret, step + 1)}"}""", full)
        assertThat(allowed.statusCode()).isEqualTo(HttpStatus.NO_CONTENT.value())
    }

    @Test
    fun `an administrator's reset sends a user back to setting a method up while it is required`() {
        switchOn()
        setRequired(true)

        mfaService.reset(user.id!!)

        val login = login()
        assertThat(login.body).contains(""""mfaRequired":false""")
        assertThat(get("/api/users/info", login.jwt).body()).contains(""""mfaSetupRequired":true""")
    }

    // ---- HTTP helpers

    private class Login(val jwt: String, val body: String)

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
        return Login(jwtOf(response), response.body())
    }

    private fun jwtOf(response: HttpResponse<*>): String = response.headers().allValues("set-cookie")
        .first { it.startsWith("${TafelLoginFilter.jwtCookieName}=") }
        .substringAfter("=").substringBefore(";")

    private fun get(path: String, jwt: String): HttpResponse<String> = httpClient.send(
        HttpRequest.newBuilder(URI.create("http://localhost:$port$path"))
            .header("Cookie", "${TafelLoginFilter.jwtCookieName}=$jwt")
            .GET()
            .build(),
        HttpResponse.BodyHandlers.ofString(),
    )

    /**
     * A state-changing request needs the CSRF token the server hands out on the first response of a
     * session: it is a cookie, and has to come back as the `X-XSRF-TOKEN` header too.
     */
    private fun post(path: String, json: String, jwt: String): HttpResponse<String> {
        val csrf = get("/api/users/info", jwt).headers().allValues("set-cookie")
            .first { it.startsWith("XSRF-TOKEN=") }
            .substringAfter("=").substringBefore(";")
        return httpClient.send(
            HttpRequest.newBuilder(URI.create("http://localhost:$port$path"))
                .header("Cookie", "${TafelLoginFilter.jwtCookieName}=$jwt; XSRF-TOKEN=$csrf")
                .header("X-XSRF-TOKEN", csrf)
                .header("Content-Type", "application/json")
                .POST(HttpRequest.BodyPublishers.ofString(json))
                .build(),
            HttpResponse.BodyHandlers.ofString(),
        )
    }
}
