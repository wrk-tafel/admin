package at.wrk.tafel.admin.backend.common.sse

import at.wrk.tafel.admin.backend.AdminBackendApplication
import at.wrk.tafel.admin.backend.TEST_POSTGRES_IMAGE
import at.wrk.tafel.admin.backend.common.auth.components.TafelSessionAttributes
import at.wrk.tafel.admin.backend.common.test.TestdataGenerator.createUser
import at.wrk.tafel.admin.backend.database.model.auth.UserRepository
import org.assertj.core.api.Assertions.assertThat
import org.junit.jupiter.api.AfterEach
import org.junit.jupiter.api.BeforeEach
import org.junit.jupiter.api.Test
import org.springframework.boot.builder.SpringApplicationBuilder
import org.springframework.boot.test.context.TestComponent
import org.springframework.boot.web.server.context.WebServerApplicationContext
import org.springframework.context.ConfigurableApplicationContext
import org.springframework.http.HttpStatus
import org.springframework.security.access.prepost.PreAuthorize
import org.springframework.security.crypto.password.PasswordEncoder
import org.springframework.web.bind.annotation.GetMapping
import org.springframework.web.bind.annotation.RequestMapping
import org.springframework.web.bind.annotation.RestController
import org.testcontainers.postgresql.PostgreSQLContainer
import java.io.InputStream
import java.net.Socket
import java.net.URI
import java.net.http.HttpClient
import java.net.http.HttpRequest
import java.net.http.HttpResponse
import java.util.Base64
import java.util.concurrent.CountDownLatch
import java.util.concurrent.TimeUnit
import kotlin.concurrent.thread

/**
 * What a stop does to the requests it finds in progress: an ordinary request is answered, and an
 * open event stream is ended at once instead of holding the stop for the whole
 * `spring.lifecycle.timeout-per-shutdown-phase`. Only a real Tomcat shows either - its graceful
 * shutdown is what counts a stream as a request in progress.
 *
 * The test stops the application, so it starts one of its own instead of taking a context from the
 * test framework: that one is cached and shared, and the framework expects to find it running
 * after the test. Its own database container keeps this application's connections off the one the
 * other integration tests share, which runs close to its connection limit.
 */
class GracefulShutdownIT {

    companion object {
        private val postgreSQLContainer: PostgreSQLContainer = PostgreSQLContainer(TEST_POSTGRES_IMAGE)
            .withDatabaseName("tafeladmin-gracefulshutdown")
            .withUsername("admin")
            .withPassword("admin")
            .apply { start() }

        // Not fields of the controller: method security wraps it in a proxy, which would ask a
        // caller of their accessors for an authentication.
        private val slowRequestEntered = CountDownLatch(1)
        private val slowRequestRelease = CountDownLatch(1)
    }

    @TestComponent
    @RestController
    @RequestMapping("/api/graceful-shutdown-test")
    @PreAuthorize("isAuthenticated()")
    class SlowController {
        @GetMapping("/slow")
        fun slow(): String {
            slowRequestEntered.countDown()
            slowRequestRelease.await(20, TimeUnit.SECONDS)
            return "done"
        }
    }

    private val httpClient = HttpClient.newHttpClient()
    private val password = "aNewSecretPassword1"
    private lateinit var application: ConfigurableApplicationContext
    private lateinit var username: String
    private var port: Int = 0

    @BeforeEach
    fun beforeEach() {
        application = SpringApplicationBuilder(AdminBackendApplication::class.java, SlowController::class.java)
            .properties(
                mapOf(
                    "spring.datasource.url" to postgreSQLContainer.jdbcUrl,
                    "spring.datasource.username" to postgreSQLContainer.username,
                    "spring.datasource.password" to postgreSQLContainer.password,
                ),
            )
            .run()
        port = (application as WebServerApplicationContext).webServer!!.port

        val user = createUser().apply {
            this.password = application.getBean(PasswordEncoder::class.java).encode(this@GracefulShutdownIT.password)!!
        }
        username = application.getBean(UserRepository::class.java).saveAndFlush(user).username!!
    }

    @AfterEach
    fun afterEach() {
        slowRequestRelease.countDown()
        application.close()
    }

    @Test
    fun `a stop ends open event streams at once and still answers the request in progress`() {
        val jwt = login()

        Socket("localhost", port).use { stream ->
            stream.soTimeout = 10_000
            stream.getOutputStream().apply {
                write(
                    (
                        "GET /api/sse/events?topics=config HTTP/1.1\r\n" +
                            "Host: localhost:$port\r\n" +
                            "Accept: text/event-stream\r\n" +
                            "Cookie: ${TafelSessionAttributes.COOKIE_NAME}=$jwt\r\n\r\n"
                        ).toByteArray(),
                )
                flush()
            }
            val streamInput = stream.getInputStream()
            assertThat(readUntil(streamInput, "\r\n\r\n")).contains(HttpStatus.OK.value().toString())

            val slowResponse = httpClient.sendAsync(
                HttpRequest.newBuilder(URI.create("http://localhost:$port/api/graceful-shutdown-test/slow"))
                    .header("Cookie", "${TafelSessionAttributes.COOKIE_NAME}=$jwt")
                    .build(),
                HttpResponse.BodyHandlers.ofString(),
            )
            assertThat(slowRequestEntered.await(10, TimeUnit.SECONDS)).isTrue()

            val stop = thread { application.close() }

            // The chunk of length zero is how a chunked response says it is complete.
            readUntil(streamInput, "0\r\n\r\n")
            assertThat(stop.isAlive).isTrue()

            slowRequestRelease.countDown()
            val response = slowResponse.get(10, TimeUnit.SECONDS)
            assertThat(response.statusCode()).isEqualTo(HttpStatus.OK.value())
            assertThat(response.body()).isEqualTo("done")

            stop.join(15_000)
            assertThat(stop.isAlive).isFalse()
        }
    }

    private fun readUntil(input: InputStream, terminator: String): String {
        val received = StringBuilder()
        while (!received.endsWith(terminator)) {
            val next = input.read()
            check(next >= 0) { "Connection closed before '$terminator' arrived: $received" }
            received.append(next.toChar())
        }
        return received.toString()
    }

    private fun login(): String {
        val credentials = Base64.getEncoder().encodeToString("$username:$password".toByteArray())
        val response = httpClient.send(
            HttpRequest.newBuilder(URI.create("http://localhost:$port/api/login"))
                .header("Authorization", "Basic $credentials")
                .POST(HttpRequest.BodyPublishers.noBody())
                .build(),
            HttpResponse.BodyHandlers.ofString(),
        )
        assertThat(response.statusCode()).isEqualTo(HttpStatus.OK.value())
        return response.headers().allValues("set-cookie")
            .first { it.startsWith("${TafelSessionAttributes.COOKIE_NAME}=") }
            .substringAfter("=").substringBefore(";")
    }
}
