package at.wrk.tafel.admin.backend.config.properties

import io.mockk.every
import io.mockk.mockk
import io.mockk.verify
import org.assertj.core.api.Assertions.assertThat
import org.junit.jupiter.api.BeforeEach
import org.junit.jupiter.api.Test
import org.junit.jupiter.api.io.TempDir
import org.springframework.cloud.context.refresh.ContextRefresher
import org.springframework.context.ApplicationEventPublisher
import org.springframework.core.env.MapPropertySource
import org.springframework.core.env.StandardEnvironment
import java.nio.file.Files
import java.nio.file.Path
import java.nio.file.attribute.FileTime

/**
 * Covers the half of the mechanism this project owns: noticing that a watched config file changed
 * and asking Spring Cloud to refresh. The refresh itself is mocked here - what it actually does to
 * the environment and to [TafelAdminProperties] is proven against a real context in
 * `ConfigFileReloadServiceRebindTest`.
 *
 * The environment is hand-built to the shape Spring Boot produces at startup: a classpath
 * `application.yml` at the bottom and, above it, an external config file named the way Boot names
 * it (`Config resource 'file [...]' via location '...'`), which is how the service discovers which
 * files to watch in the first place.
 */
internal class ConfigFileReloadServiceTest {

    @TempDir
    private lateinit var tempDir: Path

    private lateinit var configFile: Path
    private lateinit var environment: StandardEnvironment
    private lateinit var contextRefresher: ContextRefresher
    private val publishedEvents = mutableListOf<ConfigurationReloadedEvent>()

    @BeforeEach
    fun setup() {
        configFile = tempDir.resolve("config.yml")
        environment = StandardEnvironment()
        environment.propertySources.addLast(
            MapPropertySource(
                "Config resource 'class path resource [application.yml]' via location 'optional:classpath:/'",
                mapOf("tafeladmin.version" to "dev"),
            ),
        )
        contextRefresher = mockk<ContextRefresher>()
        every { contextRefresher.refresh() } returns setOf("tafeladmin.storage.scannerEnabled")
        publishedEvents.clear()
    }

    private fun startWithConfigFile(content: String): ConfigFileReloadService {
        Files.writeString(configFile, content)
        environment.propertySources.addFirst(
            MapPropertySource("Config resource 'file [$configFile]' via location 'file:$configFile'", emptyMap()),
        )
        return createService()
    }

    private fun createService(): ConfigFileReloadService {
        val eventPublisher = ApplicationEventPublisher { event -> publishedEvents.add(event as ConfigurationReloadedEvent) }
        return ConfigFileReloadService(environment, contextRefresher, eventPublisher)
    }

    /**
     * Writing the same byte count within the same filesystem timestamp tick would look unchanged,
     * which is exactly what the fingerprint is supposed to catch - so tests push the timestamp
     * forward explicitly instead of relying on the clock.
     */
    private fun touchConfigFile(content: String) {
        Files.writeString(configFile, content)
        Files.setLastModifiedTime(configFile, FileTime.fromMillis(System.currentTimeMillis() + 10_000))
    }

    @Test
    fun `does nothing while the config files are untouched`() {
        val service = startWithConfigFile("tafeladmin:\n  environmentLabel: TEST\n")

        service.reloadChangedConfigFiles()

        verify(exactly = 0) { contextRefresher.refresh() }
        assertThat(publishedEvents).isEmpty()
    }

    @Test
    fun `refreshes and publishes once an edited file is noticed`() {
        val service = startWithConfigFile("tafeladmin:\n  storage:\n    scannerEnabled: true\n")

        touchConfigFile("tafeladmin:\n  storage:\n    scannerEnabled: false\n")
        service.reloadChangedConfigFiles()

        verify(exactly = 1) { contextRefresher.refresh() }
        assertThat(publishedEvents).singleElement()
            .satisfies({ assertThat(it.changedKeys).containsExactly("tafeladmin.storage.scannerEnabled") })
    }

    @Test
    fun `a deleted config file is a change too`() {
        val service = startWithConfigFile("tafeladmin:\n  environmentLabel: TEST\n")

        Files.delete(configFile)
        service.reloadChangedConfigFiles()

        verify(exactly = 1) { contextRefresher.refresh() }
    }

    /**
     * A save that only reformatted the file or changed a comment reaches the refresh but resolves
     * to no changed keys - nobody else needs to hear about that.
     */
    @Test
    fun `publishes nothing when the refresh reports no changed keys`() {
        every { contextRefresher.refresh() } returns emptySet()
        val service = startWithConfigFile("tafeladmin:\n  environmentLabel: TEST\n")

        touchConfigFile("tafeladmin:\n  # a comment nobody binds\n  environmentLabel: TEST\n")
        service.reloadChangedConfigFiles()

        verify(exactly = 1) { contextRefresher.refresh() }
        assertThat(publishedEvents).isEmpty()
    }

    @Test
    fun `a failing refresh is survivable and publishes nothing`() {
        every { contextRefresher.refresh() } throws IllegalStateException("broken config")
        val service = startWithConfigFile("tafeladmin:\n  environmentLabel: TEST\n")

        touchConfigFile("tafeladmin:\n  environmentLabel: [unclosed\n")
        service.reloadChangedConfigFiles()

        assertThat(publishedEvents).isEmpty()
    }

    /**
     * The production file always exists at startup, but an `optional:` location may point at a file
     * that only appears later - it has to be watched from the moment it shows up, not from the next
     * restart.
     */
    @Test
    fun `picks up a declared config file that only appears after startup`() {
        environment.propertySources.addFirst(
            MapPropertySource("test-cli-args", mapOf("spring.config.import" to "optional:file:$configFile")),
        )
        val service = createService()

        service.reloadChangedConfigFiles()
        verify(exactly = 0) { contextRefresher.refresh() }

        touchConfigFile("tafeladmin:\n  environmentLabel: LATE\n")
        service.reloadChangedConfigFiles()

        verify(exactly = 1) { contextRefresher.refresh() }
    }

    @Test
    fun `resolves placeholders in declared locations`() {
        System.setProperty("test.config.dir", tempDir.toString())
        try {
            environment.propertySources.addFirst(
                MapPropertySource(
                    "test-cli-args",
                    mapOf("spring.config.additional-location" to "optional:file:\${test.config.dir}/config.yml"),
                ),
            )
            val service = createService()

            touchConfigFile("tafeladmin:\n  environmentLabel: LATE\n")
            service.reloadChangedConfigFiles()

            verify(exactly = 1) { contextRefresher.refresh() }
        } finally {
            System.clearProperty("test.config.dir")
        }
    }

    @Test
    fun `ignores locations that are not plain files`() {
        environment.propertySources.addFirst(
            MapPropertySource(
                "test-cli-args",
                mapOf("spring.config.additional-location" to "classpath:/nope.yml,configtree:/run/secrets/,file:$tempDir/"),
            ),
        )
        val service = createService()
        Files.writeString(tempDir.resolve("nope.yml"), "tafeladmin:\n  environmentLabel: NOPE\n")

        service.reloadChangedConfigFiles()

        verify(exactly = 0) { contextRefresher.refresh() }
    }
}
