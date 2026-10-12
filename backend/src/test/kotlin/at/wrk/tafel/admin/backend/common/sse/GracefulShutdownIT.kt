package at.wrk.tafel.admin.backend.common.sse

import at.wrk.tafel.admin.backend.TafelBaseIntegrationTest
import at.wrk.tafel.admin.backend.common.auth.components.TafelLoginFilter
import at.wrk.tafel.admin.backend.common.test.TestdataGenerator.createUser
import at.wrk.tafel.admin.backend.database.model.auth.UserEntity
import at.wrk.tafel.admin.backend.database.model.auth.UserRepository
import org.assertj.core.api.Assertions.assertThat
import org.junit.jupiter.api.BeforeEach
import org.junit.jupiter.api.Test
import org.springframework.beans.factory.annotation.Autowired
import org.springframework.boot.test.context.SpringBootTest
import org.springframework.boot.test.context.TestComponent
import org.springframework.boot.test.web.server.LocalServerPort
import org.springframework.context.ConfigurableApplicationContext
import org.springframework.context.annotation.Import
import org.springframework.http.HttpStatus
import org.springframework.security.access.prepost.PreAuthorize
import org.springframework.security.crypto.password.PasswordEncoder
import org.springframework.test.annotation.DirtiesContext
import org.springframework.test.context.TestContextManager
import org.springframework.transaction.support.TransactionTemplate
import org.springframework.web.bind.annotation.GetMapping
import org.springframework.web.bind.annotation.RequestMapping
import org.springframework.web.bind.annotation.RestController
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
 * The test closes the application context. [SlowController] gives it a context no other class
 * shares, and [forgetClosedContext] takes that one out of the test framework's cache, which would
 * otherwise try to restart it after the test.
 */
@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
@Import(GracefulShutdownIT.SlowController::class)
class GracefulShutdownIT : TafelBaseIntegrationTest() {

    companion object {
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

    @LocalServerPort
    private var port: Int = 0

    @Autowired
    private lateinit var applicationContext: ConfigurableApplicationContext

    @Autowired
    private lateinit var userRepository: UserRepository

    @Autowired
    private lateinit var transactionTemplate: TransactionTemplate

    @Autowired
    private lateinit var passwordEncoder: PasswordEncoder

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
                            "Cookie: ${TafelLoginFilter.jwtCookieName}=$jwt\r\n\r\n"
                        ).toByteArray(),
                )
                flush()
            }
            val streamInput = stream.getInputStream()
            assertThat(readUntil(streamInput, "\r\n\r\n")).contains(HttpStatus.OK.value().toString())

            val slowResponse = httpClient.sendAsync(
                HttpRequest.newBuilder(URI.create("http://localhost:$port/api/graceful-shutdown-test/slow"))
                    .header("Cookie", "${TafelLoginFilter.jwtCookieName}=$jwt")
                    .build(),
                HttpResponse.BodyHandlers.ofString(),
            )
            assertThat(slowRequestEntered.await(10, TimeUnit.SECONDS)).isTrue()

            val stop = thread {
                applicationContext.close()
                forgetClosedContext()
            }

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

    /**
     * Has to happen before the test method returns: the framework's listeners look the context up
     * right after it, ahead of any `@AfterEach`.
     */
    private fun forgetClosedContext() {
        TestContextManager(javaClass).testContext.markApplicationContextDirty(DirtiesContext.HierarchyMode.EXHAUSTIVE)
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
