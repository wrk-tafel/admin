package at.wrk.tafel.admin.backend.common.sse

import at.wrk.tafel.admin.backend.TafelBaseIntegrationTest
import at.wrk.tafel.admin.backend.common.auth.components.TafelLoginFilter
import at.wrk.tafel.admin.backend.common.test.TestdataGenerator.createUser
import at.wrk.tafel.admin.backend.database.common.sseoutbox.SseOutboxService
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
import org.springframework.test.context.DynamicPropertyRegistry
import org.springframework.test.context.DynamicPropertySource
import org.springframework.transaction.support.TransactionTemplate
import java.net.Socket
import java.net.URI
import java.net.http.HttpClient
import java.net.http.HttpRequest
import java.net.http.HttpResponse
import java.nio.file.Files
import java.nio.file.Path
import java.time.Duration
import java.time.Instant
import java.util.Base64

/**
 * What the access log says about an SSE stream whose client went away - with the status and
 * connection-state part of the pattern `application.yml` ships.
 *
 * Tomcat sets the status of an asynchronous request that ended on a failed write to 500 by itself
 * (`CoyoteAdapter.asyncDispatch`), after the application is done with it, so nothing the emitter
 * does on a failed heartbeat keeps that 500 out of the log. What the log can do is say that the
 * connection was aborted (`%X`), which a server error on an intact connection is not. Only a real
 * Tomcat shows either: no mocked emitter goes through its async state machine.
 */
@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
class SseStreamEndAccessLogIT : TafelBaseIntegrationTest() {

    companion object {
        private val accessLogDirectory: Path = Files.createTempDirectory("sse-stream-end-access-log")

        @DynamicPropertySource
        @JvmStatic
        fun accessLogProperties(registry: DynamicPropertyRegistry) {
            registry.add("server.tomcat.accesslog.enabled") { "true" }
            registry.add("server.tomcat.accesslog.directory") { accessLogDirectory.toString() }
            registry.add("server.tomcat.accesslog.buffered") { "false" }
            registry.add("server.tomcat.accesslog.rotate") { "false" }
            registry.add("server.tomcat.accesslog.prefix") { "access" }
            registry.add("server.tomcat.accesslog.suffix") { ".log" }
            registry.add("server.tomcat.accesslog.pattern") { "%m %U %s %X" }
        }
    }

    @LocalServerPort
    private var port: Int = 0

    @Autowired
    private lateinit var userRepository: UserRepository

    @Autowired
    private lateinit var transactionTemplate: TransactionTemplate

    @Autowired
    private lateinit var passwordEncoder: PasswordEncoder

    @Autowired
    private lateinit var sseOutboxService: SseOutboxService

    private val accessLog = accessLogDirectory.resolve("access.log")
    private val httpClient = HttpClient.newHttpClient()
    private val password = "aNewSecretPassword1"
    private lateinit var user: UserEntity

    @BeforeEach
    fun beforeEach() {
        val encodedPassword = passwordEncoder.encode(password)!!
        user = transactionTemplate.execute {
            userRepository.saveAndFlush(createUser().apply { this.password = encodedPassword })
        }
    }

    @AfterEach
    fun afterEach() {
        transactionTemplate.execute { userRepository.deleteById(user.id!!) }
    }

    @Test
    fun `a stream whose client went away is marked as an aborted connection, a completed request is not`() {
        val jwt = login()

        Socket("localhost", port).use { socket ->
            socket.getOutputStream().apply {
                write(
                    (
                        "GET /api/sse/events?topics=config HTTP/1.1\r\n" +
                            "Host: localhost:$port\r\n" +
                            "Accept: text/event-stream\r\n" +
                            "Cookie: ${TafelLoginFilter.jwtCookieName}=$jwt\r\n\r\n"
                        ).toByteArray(),
                )
                flush()
            }
            val statusLine = socket.getInputStream().bufferedReader().readLine()
            assertThat(statusLine).contains(HttpStatus.OK.value().toString())
        }

        assertThat(awaitStreamEndInAccessLog()).isEqualTo("GET /api/sse/events 500 X")
        assertThat(Files.readAllLines(accessLog)).contains("POST /api/login 200 +")
    }

    /**
     * The first write after the client closed its socket still succeeds - the peer answers it with a
     * reset, and only the write after that fails. So the heartbeat is repeated until the stream's
     * line shows up.
     */
    private fun awaitStreamEndInAccessLog(): String {
        val deadline = Instant.now().plus(Duration.ofSeconds(20))
        while (Instant.now().isBefore(deadline)) {
            sseOutboxService.sendHeartbeats()
            Thread.sleep(200)
            val line = Files.readAllLines(accessLog).firstOrNull { it.contains("/api/sse/events") }
            if (line != null) {
                return line
            }
        }
        error("The stream never ended: ${Files.readAllLines(accessLog)}")
    }

    private fun login(): String {
        val credentials = Base64.getEncoder().encodeToString("${user.username}:$password".toByteArray())
        val response = httpClient.send(
            HttpRequest.newBuilder(URI.create("http://localhost:$port/api/login"))
                .header("Authorization", "Basic $credentials")
                .POST(HttpRequest.BodyPublishers.noBody())
                .build(),
            HttpResponse.BodyHandlers.ofString(),
        )
        assertThat(response.statusCode()).isEqualTo(HttpStatus.OK.value())
        return response.headers().allValues("set-cookie")
            .first { it.startsWith("${TafelLoginFilter.jwtCookieName}=") }
            .substringAfter("=").substringBefore(";")
    }
}
