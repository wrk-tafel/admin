package at.wrk.tafel.admin.backend.config.properties

import ch.qos.logback.classic.Level
import ch.qos.logback.classic.Logger
import ch.qos.logback.classic.spi.ILoggingEvent
import ch.qos.logback.core.read.ListAppender
import io.mockk.every
import io.mockk.impl.annotations.InjectMockKs
import io.mockk.impl.annotations.RelaxedMockK
import io.mockk.junit5.MockKExtension
import org.assertj.core.api.Assertions.assertThat
import org.junit.jupiter.api.Test
import org.junit.jupiter.api.extension.ExtendWith
import org.slf4j.LoggerFactory
import org.springframework.boot.DefaultApplicationArguments
import org.springframework.boot.tomcat.autoconfigure.TomcatServerProperties
import org.yaml.snakeyaml.Yaml
import java.io.File

@ExtendWith(MockKExtension::class)
class AccessLogPatternCheckTest {

    @RelaxedMockK
    private lateinit var tomcatServerProperties: TomcatServerProperties

    @InjectMockKs
    private lateinit var check: AccessLogPatternCheck

    @Test
    fun `logs a warning when the effective pattern differs from what application-yml ships`() {
        every { tomcatServerProperties.accesslog.pattern } returns "%h %l %u %t %r %s %b (%D ms)"

        withLogAppender { logAppender ->
            check.run(DefaultApplicationArguments())

            assertThat(logAppender.list).anySatisfy {
                assertThat(it.level).isEqualTo(Level.WARN)
                assertThat(it.formattedMessage)
                    .contains("%h %l %u %t %r %s %b (%D ms)")
                    .contains(AccessLogPatternCheck.EXPECTED_PATTERN)
            }
        }
    }

    @Test
    fun `logs nothing when the effective pattern matches what application-yml ships`() {
        every { tomcatServerProperties.accesslog.pattern } returns AccessLogPatternCheck.EXPECTED_PATTERN

        withLogAppender { logAppender ->
            check.run(DefaultApplicationArguments())

            assertThat(logAppender.list).isEmpty()
        }
    }

    /**
     * A `@SpringBootTest` can't verify this: `src/test/resources/application.yml` shadows the main
     * one on the test classpath, so the effective bound value in a booted test context is whatever
     * (or nothing) that file declares, never `application.yml`'s. Reading the shipped file directly
     * is what actually guards [AccessLogPatternCheck.EXPECTED_PATTERN] against drifting out of sync
     * with it.
     */
    @Test
    fun `expected pattern matches what application-yml ships`() {
        val yaml = Yaml().load<Map<String, Any>>(File("src/main/resources/application.yml").inputStream())

        @Suppress("UNCHECKED_CAST")
        val shippedPattern = ((yaml["server"] as Map<String, Any>)["tomcat"] as Map<String, Any>)
            .let { it["accesslog"] as Map<String, Any> }["pattern"]

        assertThat(shippedPattern).isEqualTo(AccessLogPatternCheck.EXPECTED_PATTERN)
    }

    private fun withLogAppender(block: (ListAppender<ILoggingEvent>) -> Unit) {
        val logger = LoggerFactory.getLogger(AccessLogPatternCheck::class.java) as Logger
        val logAppender = ListAppender<ILoggingEvent>().apply { start() }
        logger.addAppender(logAppender)
        try {
            block(logAppender)
        } finally {
            logger.detachAppender(logAppender)
        }
    }
}
