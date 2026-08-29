package at.wrk.tafel.admin.backend.modules.support.internal

import at.wrk.tafel.admin.backend.modules.support.model.ClientErrorReportRequest
import ch.qos.logback.classic.Level
import ch.qos.logback.classic.Logger
import ch.qos.logback.classic.spi.ILoggingEvent
import ch.qos.logback.core.read.ListAppender
import org.assertj.core.api.Assertions.assertThat
import org.junit.jupiter.api.AfterEach
import org.junit.jupiter.api.BeforeEach
import org.junit.jupiter.api.Test
import org.slf4j.LoggerFactory
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken
import org.springframework.security.core.context.SecurityContextHolder

class ClientErrorLogServiceTest {

    private val service = ClientErrorLogService()

    private lateinit var logAppender: ListAppender<ILoggingEvent>
    private lateinit var logger: Logger

    @BeforeEach
    fun setUp() {
        logger = LoggerFactory.getLogger("at.wrk.tafel.admin.backend.CLIENT_ERROR") as Logger
        logAppender = ListAppender<ILoggingEvent>().apply { start() }
        logger.addAppender(logAppender)
    }

    @AfterEach
    fun tearDown() {
        logger.detachAppender(logAppender)
        SecurityContextHolder.clearContext()
    }

    @Test
    fun `logs the reported error at warn level`() {
        SecurityContextHolder.getContext().authentication = UsernamePasswordAuthenticationToken("test-user", null, emptyList())

        service.record(
            ClientErrorReportRequest(
                message = "TypeError: x is not a function",
                page = "http://localhost/kunden/suchen",
                userAgent = "Mozilla/5.0",
            ),
        )

        assertThat(logAppender.list).hasSize(1)
        assertThat(logAppender.list.single().level).isEqualTo(Level.WARN)
        assertThat(logAppender.list.single().formattedMessage)
            .contains("test-user")
            .contains("http://localhost/kunden/suchen")
            .contains("Mozilla/5.0")
            .contains("TypeError: x is not a function")
    }

    @Test
    fun `logs an unknown user when there is no authentication`() {
        service.record(ClientErrorReportRequest(message = "boom"))

        assertThat(logAppender.list.single().formattedMessage)
            .contains("unbekannt")
            .contains("boom")
    }

    @Test
    fun `sanitizes newlines out of every field so one client error cannot forge extra log lines`() {
        SecurityContextHolder.getContext().authentication = UsernamePasswordAuthenticationToken("test\nuser", null, emptyList())

        service.record(
            ClientErrorReportRequest(
                message = "boom\nWARN forged log line",
                page = "http://localhost/x\ny",
                userAgent = "Mozilla\n5.0",
            ),
        )

        assertThat(logAppender.list).hasSize(1)
        assertThat(logAppender.list.single().formattedMessage).doesNotContain("\n")
    }
}
