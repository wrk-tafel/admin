package at.wrk.tafel.admin.backend.config.properties

import org.slf4j.LoggerFactory
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty
import org.springframework.cloud.context.refresh.ContextRefresher
import org.springframework.context.ApplicationEventPublisher
import org.springframework.core.env.ConfigurableEnvironment
import org.springframework.core.env.EnumerablePropertySource
import org.springframework.scheduling.annotation.Scheduled
import org.springframework.stereotype.Service
import java.nio.file.Files
import java.nio.file.Path
import java.nio.file.Paths

/**
 * Picks up edits to the config files this application was started with, without a restart.
 *
 * Production supplies its settings through a single operator-managed file bind-mounted into the
 * container (`-Dspring.config.additional-location=file:/app/config/config.yml`, see
 * `_build/Dockerfile`). Spring binds that file exactly once during startup, so every change to it
 * used to need a container restart - which on this deployment also means running Flyway and
 * dropping every open SSE connection, for what may be a single boolean.
 *
 * The reload itself is Spring Cloud's [ContextRefresher] (`spring-cloud-context`): it re-runs
 * Spring Boot's own config-data pipeline against the running context, so profile-specific
 * documents, `spring.config.import` chains, placeholder resolution and property-source precedence
 * all resolve exactly as they did at startup, rather than being approximated here. It then re-binds
 * every `@ConfigurationProperties` bean in place - Spring's own as much as this application's, since
 * nothing about this is scoped to `tafeladmin.*`; that is what updates [TafelAdminProperties] for
 * everyone who injected it - see that class for why it is mutable and JavaBean-bound rather than a
 * data class. What Spring Cloud does *not* bring is a trigger: its refresh is driven by a POST to
 * `/actuator/refresh` or by a message bus, neither of which fits "an operator edits the file on the
 * host", so this service supplies one by watching the files for changes.
 *
 * Polling rather than `java.nio.file.WatchService` for the same reason the scanner folder is polled
 * (`DocumentScannerWatcherService`): the watched file is a bind mount, and filesystem events are
 * unreliable across those.
 *
 * What a refresh does *not* do is re-create the beans that were built *from* configuration. A value
 * that was read once and turned into something else - a `DataSource`, a Tomcat connector, the
 * security filter chain, the VAPID keypair - keeps what it was built with; only code that re-reads
 * its properties (or the [ConfigurableEnvironment]) per use sees the new value. That is the real
 * boundary of what reloading achieves, and it cuts across the whole configuration rather than
 * separating `tafeladmin.*` from the rest: changing `tafeladmin.push.vapidPublicKey` needs a restart
 * for the same reason `spring.datasource.url` does. A second, narrower limit applies to
 * `@ConfigurationProperties` classes that are constructor-bound: those can only be replaced, never
 * updated, so the rebinder leaves them as they are.
 *
 * Reloading can be switched off entirely with `tafeladmin.configReload.enabled: false`, which
 * leaves this bean uncreated and the application on exactly the startup-bound behaviour it had
 * before: every value stays whatever it was when the process started, until the process restarts.
 * That switch is deliberately the one setting here that a running instance can't change about
 * itself - it is read once at startup, because reloading it from the very file it governs would
 * mean a deployment that switched it off could never switch it back on without a restart anyway.
 */
@Service
@ConditionalOnProperty(name = ["tafeladmin.configReload.enabled"], havingValue = "true", matchIfMissing = true)
class ConfigFileReloadService(
    private val environment: ConfigurableEnvironment,
    private val contextRefresher: ContextRefresher,
    private val eventPublisher: ApplicationEventPublisher,
) {

    // Seeded up front so the very first tick compares against what was actually loaded at startup
    // instead of reporting every watched file as new.
    private val fingerprints: MutableMap<Path, String> = watchedFiles().associateWith(::fingerprintOf).toMutableMap()

    /**
     * The schedule is a plain placeholder rather than a [TafelAdminProperties] field on purpose:
     * `@Scheduled` fixes it when the bean is created, so a reloaded value could never take effect,
     * and listing it as configuration would advertise a liveness it doesn't have. The e2e profile
     * shortens it so the Cypress run doesn't have to wait out a production-sized interval.
     *
     * A cron rather than a fixed delay because this is the one scheduled job that deliberately runs
     * on *every* instance - each has to re-read its own copy of the file - and they should therefore
     * pick a change up together. A fixed delay is phased by whenever each instance happened to boot
     * and drifts further with every tick, which would leave instances answering from different
     * configuration for up to a whole interval after an operator's edit. A cron fires on the
     * wall-clock boundary, so the spread is what their clocks differ by rather than where they are
     * in their own polling cycle.
     */
    @Scheduled(cron = "\${tafeladmin.configReload.cron:*/5 * * * * *}")
    fun reloadChangedConfigFiles() {
        val changedFiles = watchedFiles().filter(::hasChanged)
        if (changedFiles.isEmpty()) {
            return
        }
        changedFiles.forEach { logger.info("Config file changed, reloading: {}", it) }
        val droppedDeletedFiles = dropPropertySourcesOfDeletedFiles(changedFiles)

        // Returns the keys whose value actually differs, so a save that changed only a comment or
        // reformatted the file resolves to "nothing changed" and stays invisible to everyone else.
        val changedKeys = runCatching { contextRefresher.refresh() }.getOrElse {
            logger.error("Reloaded configuration couldn't be applied, keeping the values currently in use", it)
            return
        }
        if (changedKeys.isEmpty() && !droppedDeletedFiles) {
            logger.info("Config file changed but the resulting configuration is unchanged")
            return
        }

        logger.info("Applied reloaded configuration without a restart, changed keys: {}", changedKeys)
        eventPublisher.publishEvent(ConfigurationReloadedEvent(changedKeys))
    }

    /**
     * Every config file this application reads, recomputed on each tick so a file that is declared
     * as `optional:` and only created later is picked up as well:
     *
     * - the files Spring Boot itself loaded at startup, recovered from the names it gave their
     *   property sources (`Config resource 'file [...]' via location '...'`). Classpath resources
     *   name themselves differently and are correctly not matched - they live inside the jar and
     *   can't be edited in a running deployment anyway.
     * - the locations declared via `spring.config.additional-location`/`location`/`import`, which
     *   covers the ones that resolved to nothing at startup because the file wasn't there yet.
     */
    private fun watchedFiles(): Set<Path> = buildSet {
        environment.propertySources.mapNotNullTo(this) { configFileOf(it.name) }
        addAll(declaredLocationFiles())
    }

    private fun declaredLocationFiles(): List<Path> = environment.propertySources
        .filterIsInstance<EnumerablePropertySource<*>>()
        .flatMap { source ->
            source.propertyNames
                .filter { name -> LOCATION_PROPERTIES.any { name == it || name.startsWith("$it[") } }
                .mapNotNull { source.getProperty(it)?.toString() }
        }
        .flatMap { environment.resolvePlaceholders(it).split(",") }
        .mapNotNull(::toWatchableFile)

    private fun toWatchableFile(location: String): Path? {
        val withoutOptional = location.trim().removePrefix(OPTIONAL_PREFIX).trim()
        // Anything that isn't a plain file can't be stat'ed for changes: classpath resources are
        // inside the jar, a config tree is a directory of files, and a location ending in a
        // separator addresses a directory rather than one file.
        if (NON_FILE_PREFIXES.any { withoutOptional.startsWith(it) }) {
            return null
        }
        val path = withoutOptional.removePrefix(FILE_PREFIX)
        if (path.isBlank() || path.endsWith("/") || path.endsWith("\\")) {
            return null
        }
        return runCatching { Paths.get(path).toAbsolutePath().normalize() }.getOrNull()
    }

    private fun hasChanged(file: Path): Boolean {
        val fingerprint = fingerprintOf(file)
        return fingerprints.put(file, fingerprint) != fingerprint
    }

    /**
     * Modification time plus size: a same-second edit that changes the file's length is caught by
     * the size even where the filesystem's timestamp resolution isn't fine enough to notice.
     */
    private fun fingerprintOf(file: Path): String = runCatching {
        if (Files.isRegularFile(file)) {
            "${Files.getLastModifiedTime(file).toMillis()}:${Files.size(file)}"
        } else {
            MISSING_FILE
        }
    }.getOrDefault(MISSING_FILE)

    /**
     * A refresh recomputes the environment and merges the result back over the running one, but it
     * only ever replaces or adds property sources - a source whose file has since been deleted is
     * simply not in the recomputed environment, and so survives untouched with its old values. That
     * would make deleting a config file the one edit that doesn't take effect, so the sources of
     * files that are gone are removed here first, before the refresh re-reads what is left.
     *
     * Returns whether anything was actually removed: with the values already gone from the
     * environment before the refresh runs, the refresh itself reports no changed keys, and that
     * mustn't be read as "nothing happened".
     */
    private fun dropPropertySourcesOfDeletedFiles(changedFiles: List<Path>): Boolean {
        val obsoleteSourceNames = changedFiles
            .filterNot { Files.isRegularFile(it) }
            .flatMap { file -> environment.propertySources.filter { configFileOf(it.name) == file }.map { it.name } }

        obsoleteSourceNames.forEach {
            logger.info("Dropping configuration of a config file that no longer exists: {}", it)
            environment.propertySources.remove(it)
        }
        return obsoleteSourceNames.isNotEmpty()
    }

    private fun configFileOf(propertySourceName: String): Path? = CONFIG_FILE_PATTERN.find(propertySourceName)
        ?.groupValues?.get(1)
        ?.let { runCatching { Paths.get(it).toAbsolutePath().normalize() }.getOrNull() }

    companion object {
        private val logger = LoggerFactory.getLogger(ConfigFileReloadService::class.java)

        private const val OPTIONAL_PREFIX = "optional:"
        private const val FILE_PREFIX = "file:"
        private const val MISSING_FILE = "<missing>"

        private val NON_FILE_PREFIXES = listOf("classpath:", "configtree:")
        private val LOCATION_PROPERTIES = listOf(
            "spring.config.additional-location",
            "spring.config.location",
            "spring.config.import",
        )

        /** Matches the `file [...]` part Spring Boot puts into the name of every property source that came from a file on disk. */
        private val CONFIG_FILE_PATTERN = Regex("""file \[(.+?)]""")
    }
}
