package at.wrk.tafel.admin.backend.common.auth

import at.wrk.tafel.admin.backend.TafelBaseIntegrationTest
import at.wrk.tafel.admin.backend.common.auth.components.TafelSessionAttributes
import at.wrk.tafel.admin.backend.common.auth.model.UserPermissions
import at.wrk.tafel.admin.backend.common.test.TestdataGenerator.createUser
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
import org.springframework.jdbc.core.JdbcTemplate
import org.springframework.security.crypto.password.PasswordEncoder
import org.springframework.test.context.ActiveProfiles
import org.springframework.transaction.support.TransactionTemplate
import java.net.URI
import java.net.http.HttpClient
import java.net.http.HttpRequest
import java.net.http.HttpResponse
import java.util.Base64

/**
 * Login sessions end to end (ADR-0070) - a real database, the real security filter chain, real
 * cookies: a login is a row in `spring_session`, and ending one is what makes its cookie worthless,
 * on whatever instance the next request arrives.
 */
@SpringBootTest(
    webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT,
    // Every test logs in several times from the same address, more often than the login's rate limit allows in a
    // minute - which is RateLimitFilter's to test, not this. A context of its own, so MfaIT's keeps the limit.
    properties = ["spring.thymeleaf.prefix=classpath:/mail-templates/", "security.rateLimit.enabled=false"],
)
@ActiveProfiles("test")
class UserSessionIT : TafelBaseIntegrationTest() {

    @LocalServerPort
    private var port: Int = 0

    @Autowired
    private lateinit var userRepository: UserRepository

    @Autowired
    private lateinit var transactionTemplate: TransactionTemplate

    @Autowired
    private lateinit var passwordEncoder: PasswordEncoder

    @Autowired
    private lateinit var jdbcTemplate: JdbcTemplate

    private val httpClient = HttpClient.newHttpClient()
    private val password = "aNewSecretPassword1"

    private lateinit var user: UserEntity
    private lateinit var administrator: UserEntity

    @BeforeEach
    fun beforeEach() {
        user = createUserWith(UserPermissions.CHECKIN)
        administrator = createUserWith(UserPermissions.USER_MANAGEMENT)
    }

    @AfterEach
    fun afterEach() {
        transactionTemplate.execute {
            userRepository.findById(user.id!!).ifPresent { userRepository.delete(it) }
            userRepository.deleteById(administrator.id!!)
        }
        jdbcTemplate.update("delete from spring_session where principal_name in (?, ?)", user.username, administrator.username)
    }

    @Test
    fun `a login is a row in the session table that names its user and holds no serialized security context`() {
        login(user)

        assertThat(sessionCount(user)).isEqualTo(1)
        val attributes = jdbcTemplate.queryForList(
            """
            select a.attribute_name from spring_session_attributes a
            join spring_session s on s.primary_id = a.session_primary_id
            where s.principal_name = ?
            """.trimIndent(),
            String::class.java,
            user.username,
        )
        assertThat(attributes).doesNotContain("SPRING_SECURITY_CONTEXT")
        assertThat(attributes).contains(TafelSessionAttributes.SESSION_KEY, TafelSessionAttributes.USER_AGENT)
    }

    @Test
    fun `the session cookie is http-only and strict, and a request without it is refused`() {
        val response = loginResponse(user)
        val cookie = response.headers().allValues("set-cookie").first { it.startsWith("${TafelSessionAttributes.COOKIE_NAME}=") }

        assertThat(cookie).contains("HttpOnly").contains("SameSite=Strict")
        assertThat(get("/api/users/info", null).statusCode()).isEqualTo(HttpStatus.UNAUTHORIZED.value())
        assertThat(get("/api/users/info", "bm8tc3VjaC1zZXNzaW9u").statusCode()).isEqualTo(HttpStatus.UNAUTHORIZED.value())
    }

    @Test
    fun `the own sessions are listed with the current one marked, and never by their session id`() {
        val first = login(user, userAgent = "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:131.0) Gecko/20100101 Firefox/131.0")
        val second = login(user, userAgent = "Mozilla/5.0 (Linux; Android 14) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Mobile Safari/537.36")

        val body = get("/api/users/sessions", second).body()

        assertThat(body).contains("Firefox/131.0").contains("Chrome/130.0 Mobile")
        assertThat(Regex(""""current":true""").findAll(body).count()).isEqualTo(1)
        assertThat(body).doesNotContain(first).doesNotContain(second)
        assertThat(body).doesNotContain(sessionIdOf(first)).doesNotContain(sessionIdOf(second))
    }

    @Test
    fun `ending another session makes its cookie worthless at once`() {
        val elsewhere = login(user)
        val here = login(user)
        val elsewhereKey = keyOf(here, current = false)

        assertThat(delete("/api/users/sessions/$elsewhereKey", here).statusCode()).isEqualTo(HttpStatus.NO_CONTENT.value())

        assertThat(get("/api/users/info", elsewhere).statusCode()).isEqualTo(HttpStatus.UNAUTHORIZED.value())
        assertThat(get("/api/users/info", here).statusCode()).isEqualTo(HttpStatus.OK.value())
        assertThat(sessionCount(user)).isEqualTo(1)
    }

    @Test
    fun `the current session is not ended from the list, and another user's session cannot be ended at all`() {
        val here = login(user)
        val others = login(administrator)

        assertThat(delete("/api/users/sessions/${keyOf(here, current = true)}", here).statusCode()).isEqualTo(HttpStatus.BAD_REQUEST.value())
        assertThat(delete("/api/users/sessions/${keyOf(others, current = true)}", here).statusCode()).isEqualTo(HttpStatus.NOT_FOUND.value())
        assertThat(get("/api/users/info", others).statusCode()).isEqualTo(HttpStatus.OK.value())
    }

    @Test
    fun `ending all other sessions keeps only the current one`() {
        val first = login(user)
        val second = login(user)
        val here = login(user)

        assertThat(delete("/api/users/sessions", here).statusCode()).isEqualTo(HttpStatus.NO_CONTENT.value())

        assertThat(get("/api/users/info", first).statusCode()).isEqualTo(HttpStatus.UNAUTHORIZED.value())
        assertThat(get("/api/users/info", second).statusCode()).isEqualTo(HttpStatus.UNAUTHORIZED.value())
        assertThat(get("/api/users/info", here).statusCode()).isEqualTo(HttpStatus.OK.value())
    }

    @Test
    fun `logging out ends only the session it was done on`() {
        val elsewhere = login(user)
        val here = login(user)

        val logout = post("/api/users/logout", "", here)

        assertThat(logout.statusCode()).isEqualTo(HttpStatus.OK.value())
        assertThat(logout.headers().allValues("set-cookie")).anyMatch { it.startsWith("${TafelSessionAttributes.COOKIE_NAME}=;") }
        assertThat(get("/api/users/info", here).statusCode()).isEqualTo(HttpStatus.UNAUTHORIZED.value())
        assertThat(get("/api/users/info", elsewhere).statusCode()).isEqualTo(HttpStatus.OK.value())
    }

    @Test
    fun `changing the own password ends every other session and keeps the current one`() {
        val elsewhere = login(user)
        val here = login(user)

        val change = post("/api/users/change-password", """{"passwordCurrent":"$password","passwordNew":"AnotherSecret42x"}""", here)

        assertThat(change.statusCode()).isEqualTo(HttpStatus.OK.value())
        assertThat(get("/api/users/info", here).statusCode()).isEqualTo(HttpStatus.OK.value())
        assertThat(get("/api/users/info", elsewhere).statusCode()).isEqualTo(HttpStatus.UNAUTHORIZED.value())
    }

    @Test
    fun `an administrator ends all sessions of an account`() {
        val first = login(user)
        val second = login(user)
        val admin = login(administrator)

        assertThat(delete("/api/users/${user.id}/sessions", admin).statusCode()).isEqualTo(HttpStatus.NO_CONTENT.value())

        assertThat(get("/api/users/info", first).statusCode()).isEqualTo(HttpStatus.UNAUTHORIZED.value())
        assertThat(get("/api/users/info", second).statusCode()).isEqualTo(HttpStatus.UNAUTHORIZED.value())
        assertThat(get("/api/users/info", admin).statusCode()).isEqualTo(HttpStatus.OK.value())
    }

    @Test
    fun `ending someone else's sessions needs the user management permission`() {
        val target = login(administrator)
        val caller = login(user)

        assertThat(delete("/api/users/${administrator.id}/sessions", caller).statusCode()).isEqualTo(HttpStatus.FORBIDDEN.value())
        assertThat(get("/api/users/info", target).statusCode()).isEqualTo(HttpStatus.OK.value())
    }

    @Test
    fun `a disabled account's session is refused and removed`() {
        val session = login(user)
        transactionTemplate.execute {
            userRepository.findById(user.id!!).get().also { it.enabled = false }
        }

        assertThat(get("/api/users/info", session).statusCode()).isEqualTo(HttpStatus.UNAUTHORIZED.value())
        assertThat(sessionCount(user)).isZero()
    }

    @Test
    fun `the csrf token of a session is the same on every response that hands one out, and differs between sessions`() {
        val first = login(user)
        val second = login(user)

        assertThat(csrfOf(first)).isEqualTo(csrfOf(first))
        assertThat(csrfOf(first)).isNotEqualTo(csrfOf(second))
    }

    @Test
    fun `a request on a session keeps its id - only the login and the second factor change it`() {
        val session = login(user)

        val first = get("/api/users/info", session)
        val second = get("/api/users/info", session)

        assertThat(first.statusCode()).isEqualTo(HttpStatus.OK.value())
        assertThat(second.statusCode()).isEqualTo(HttpStatus.OK.value())
        assertThat(first.headers().allValues("set-cookie")).noneMatch { it.startsWith("${TafelSessionAttributes.COOKIE_NAME}=") }
    }

    // ---- helpers

    private fun createUserWith(permission: UserPermissions): UserEntity {
        val encodedPassword = passwordEncoder.encode(password)!!
        return transactionTemplate.execute {
            val created = userRepository.saveAndFlush(createUser().apply { this.password = encodedPassword })
            created.authorities.add(UserAuthorityEntity(user = created, name = permission.key))
            userRepository.saveAndFlush(created)
        }!!
    }

    private fun sessionCount(user: UserEntity): Int = jdbcTemplate.queryForObject("select count(*) from spring_session where principal_name = ?", Int::class.java, user.username)!!

    private fun sessionIdOf(cookie: String): String = String(Base64.getDecoder().decode(cookie))

    private fun keyOf(cookie: String, current: Boolean): String {
        val body = get("/api/users/sessions", cookie).body()
        return Regex("""\{"id":"([^"]+)"[^}]*"current":$current}""").find(body)!!.groupValues[1]
    }

    private fun loginResponse(user: UserEntity, userAgent: String = "UserSessionIT"): HttpResponse<String> {
        val credentials = Base64.getEncoder().encodeToString("${user.username}:$password".toByteArray())
        val response = httpClient.send(
            HttpRequest.newBuilder(URI.create("http://localhost:$port/api/login"))
                .header("Authorization", "Basic $credentials")
                .header("User-Agent", userAgent)
                .POST(HttpRequest.BodyPublishers.noBody())
                .build(),
            HttpResponse.BodyHandlers.ofString(),
        )
        assertThat(response.statusCode()).isEqualTo(HttpStatus.OK.value())
        return response
    }

    private fun login(user: UserEntity, userAgent: String = "UserSessionIT"): String = loginResponse(user, userAgent).headers().allValues("set-cookie")
        .first { it.startsWith("${TafelSessionAttributes.COOKIE_NAME}=") }
        .substringAfter("=").substringBefore(";")

    private fun get(path: String, cookie: String?): HttpResponse<String> = httpClient.send(
        HttpRequest.newBuilder(URI.create("http://localhost:$port$path"))
            .apply { if (cookie != null) header("Cookie", "${TafelSessionAttributes.COOKIE_NAME}=$cookie") }
            .GET()
            .build(),
        HttpResponse.BodyHandlers.ofString(),
    )

    private fun csrfOf(cookie: String): String = get("/api/users/info", cookie).headers().allValues("set-cookie")
        .first { it.startsWith("XSRF-TOKEN=") }
        .substringAfter("=").substringBefore(";")

    private fun post(path: String, json: String, cookie: String) = send("POST", path, json, cookie, csrfOf(cookie))

    private fun delete(path: String, cookie: String) = send("DELETE", path, "", cookie, csrfOf(cookie))

    private fun send(method: String, path: String, json: String, cookie: String, csrf: String): HttpResponse<String> = httpClient.send(
        HttpRequest.newBuilder(URI.create("http://localhost:$port$path"))
            .header("Cookie", "${TafelSessionAttributes.COOKIE_NAME}=$cookie; XSRF-TOKEN=$csrf")
            .header("X-XSRF-TOKEN", csrf)
            .header("Content-Type", "application/json")
            .method(method, HttpRequest.BodyPublishers.ofString(json))
            .build(),
        HttpResponse.BodyHandlers.ofString(),
    )
}
