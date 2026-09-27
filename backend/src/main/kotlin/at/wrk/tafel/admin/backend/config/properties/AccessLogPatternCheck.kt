package at.wrk.tafel.admin.backend.config.properties

import org.slf4j.LoggerFactory
import org.springframework.boot.ApplicationArguments
import org.springframework.boot.ApplicationRunner
import org.springframework.boot.tomcat.autoconfigure.TomcatServerProperties
import org.springframework.stereotype.Component

/**
 * Warns when the Tomcat accesslog pattern this instance actually came up with differs from the one
 * `application.yml` ships (see [EXPECTED_PATTERN], kept in sync with that file by
 * `AccessLogPatternCheckTest`).
 *
 * `server.tomcat.*` is bound once at startup (see [ConfigFileReloadService]'s KDoc) and production
 * layers its settings from an operator-managed `config.yml`
 * (`-Dspring.config.additional-location`), which takes precedence over this application's own
 * `application.yml`. A stale override there - one written before `application.yml`'s pattern last
 * changed, for instance - silently produces an access log whose format and content no longer match
 * what the repository documents, and nothing before this surfaced that short of pulling the raw
 * production file and diffing it by hand (see issues #3703/#3747). This check can't fix a stale
 * `config.yml` - `server.tomcat.*` needs a restart to pick up a corrected value regardless - but a
 * WARNing in `app.log` at least makes the drift discoverable from inside the application itself.
 *
 * Runs as an [ApplicationRunner], not a [jakarta.annotation.PostConstruct], because the value only
 * exists once Spring Boot has finished binding [TomcatServerProperties] and built the embedded
 * Tomcat connector from it - both already true by the time `ApplicationRunner`s execute.
 */
@Component
class AccessLogPatternCheck(
    private val tomcatServerProperties: TomcatServerProperties,
) : ApplicationRunner {

    companion object {
        private val logger = LoggerFactory.getLogger(AccessLogPatternCheck::class.java)

        // Mirrors application.yml's server.tomcat.accesslog.pattern.
        const val EXPECTED_PATTERN = "%h %l %u %t \"%m %U %H\" %s %b"
    }

    override fun run(args: ApplicationArguments) {
        val effectivePattern = tomcatServerProperties.accesslog.pattern
        if (effectivePattern != EXPECTED_PATTERN) {
            logger.warn(
                "Effective Tomcat accesslog pattern ('{}') differs from the one application.yml ships ('{}') - " +
                    "an operator-managed config.yml override is likely stale. server.tomcat.* is bound once at " +
                    "startup, so correcting it needs a restart to take effect.",
                effectivePattern,
                EXPECTED_PATTERN,
            )
        }
    }
}
