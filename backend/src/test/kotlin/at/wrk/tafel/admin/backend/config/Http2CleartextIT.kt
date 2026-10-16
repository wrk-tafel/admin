package at.wrk.tafel.admin.backend.config

import at.wrk.tafel.admin.backend.TafelBaseIntegrationTest
import org.assertj.core.api.Assertions.assertThat
import org.junit.jupiter.api.Test
import org.springframework.boot.test.context.SpringBootTest
import org.springframework.boot.test.web.server.LocalServerPort
import java.io.DataInputStream
import java.net.Socket
import java.net.URI
import java.net.http.HttpClient
import java.net.http.HttpRequest
import java.net.http.HttpResponse
import java.time.Duration

/**
 * nginx talks HTTP/2 to the app without TLS (`proxy_http_version 2`), opening the connection with the
 * HTTP/2 preface straight away ("prior knowledge") rather than asking for an upgrade. Only a real
 * Tomcat shows whether its connector accepts that, next to plain HTTP/1.1 on the same port.
 */
@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
class Http2CleartextIT : TafelBaseIntegrationTest() {

    @LocalServerPort
    private var port: Int = 0

    @Test
    fun `a connection opened with the HTTP-2 preface is answered in HTTP-2`() {
        Socket("localhost", port).use { socket ->
            socket.soTimeout = 5_000
            val output = socket.getOutputStream()
            output.write("PRI * HTTP/2.0\r\n\r\nSM\r\n\r\n".toByteArray(Charsets.US_ASCII))
            // an empty SETTINGS frame: length 0, type 0x4, no flags, stream 0
            output.write(byteArrayOf(0, 0, 0, 0x4, 0, 0, 0, 0, 0))
            output.flush()

            val frameHeader = ByteArray(9)
            DataInputStream(socket.getInputStream()).readFully(frameHeader)

            // the server's first frame is its own SETTINGS frame - an HTTP/1.1 server would answer 400 text
            assertThat(frameHeader[3].toInt()).isEqualTo(0x4)
        }
    }

    @Test
    fun `an HTTP-2 client gets HTTP-2 and an HTTP-1_1 client keeps getting HTTP-1_1`() {
        val uri = URI.create("http://localhost:$port/api/config/public")

        val http2 = send(HttpClient.Version.HTTP_2, uri)
        assertThat(http2.statusCode()).isEqualTo(200)
        assertThat(http2.version()).isEqualTo(HttpClient.Version.HTTP_2)

        val http11 = send(HttpClient.Version.HTTP_1_1, uri)
        assertThat(http11.statusCode()).isEqualTo(200)
        assertThat(http11.version()).isEqualTo(HttpClient.Version.HTTP_1_1)
    }

    private fun send(version: HttpClient.Version, uri: URI): HttpResponse<String> = HttpClient.newBuilder()
        .version(version)
        .connectTimeout(Duration.ofSeconds(5))
        .build()
        .use { client -> client.send(HttpRequest.newBuilder(uri).GET().build(), HttpResponse.BodyHandlers.ofString()) }
}
