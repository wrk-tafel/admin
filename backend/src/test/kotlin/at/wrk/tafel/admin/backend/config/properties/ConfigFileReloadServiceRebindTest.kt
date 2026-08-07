package at.wrk.tafel.admin.backend.config.properties

import org.assertj.core.api.Assertions.assertThat
import org.junit.jupiter.api.Test
import org.junit.jupiter.api.io.TempDir
import org.springframework.boot.Banner
import org.springframework.boot.WebApplicationType
import org.springframework.boot.autoconfigure.ImportAutoConfiguration
import org.springframework.boot.builder.SpringApplicationBuilder
import org.springframework.boot.context.properties.EnableConfigurationProperties
import org.springframework.cloud.autoconfigure.ConfigurationPropertiesRebinderAutoConfiguration
import org.springframework.cloud.autoconfigure.RefreshAutoConfiguration
import org.springframework.context.ConfigurableApplicationContext
import org.springframework.context.annotation.Bean
import org.springframework.context.annotation.ComponentScan
import org.springframework.context.annotation.Configuration
import org.springframework.context.event.EventListener
import java.nio.file.Files
import java.nio.file.Path
import java.nio.file.attribute.FileTime

/**
 * Proves the claim the whole feature rests on: editing the external config file a running
 * application was started with changes [TafelAdminProperties] *in place*, so every bean that
 * injected it sees the new values without being re-created.
 *
 * That is the part no unit test can vouch for, because it depends on three things lining up -
 * Spring Boot deducing setter binding for these classes (a Kotlin primary constructor with
 * parameters would silently give value-object binding and make rebinding a no-op), Spring Cloud's
 * `ConfigurationPropertiesRebinder` reacting to the environment change, and
 * [ConfigFileReloadService] noticing the file at all.
 *
 * Boots a minimal context rather than the real application: no database, no web server, no Flyway -
 * this is about the configuration mechanism, and pulling in the rest would only make it slow and
 * flaky. It carries a `*Test` name even though it starts a context, because `*IT` here means a
 * `@SpringBootTest` on Testcontainers (see `NamingConventionsTest`) and this is neither. Scheduling
 * stays off too: the tests call [ConfigFileReloadService.reloadChangedConfigFiles] directly rather
 * than waiting out (or racing) a poll interval.
 */
internal class ConfigFileReloadServiceRebindTest {

    @TempDir
    private lateinit var tempDir: Path

    // Deliberately @Configuration and not @SpringBootConfiguration: the latter is what
    // `@SpringBootTest` searches the surrounding package for, so any integration test that ever
    // lands in this package would silently boot this stripped-down context instead of the real
    // application. SpringApplicationBuilder is happy with a plain configuration class.
    @Configuration
    @EnableConfigurationProperties(TafelAdminProperties::class)
    @ComponentScan(basePackageClasses = [ConfigFileReloadService::class])
    @ImportAutoConfiguration(RefreshAutoConfiguration::class, ConfigurationPropertiesRebinderAutoConfiguration::class)
    internal class ReloadTestApp {

        @Bean
        fun recordingListener() = RecordingListener()
    }

    internal class RecordingListener {
        val events = mutableListOf<ConfigurationReloadedEvent>()

        @EventListener
        fun onConfigurationReloaded(event: ConfigurationReloadedEvent) {
            events.add(event)
        }
    }

    private fun start(configFile: Path, vararg extraArgs: String): ConfigurableApplicationContext = SpringApplicationBuilder(ReloadTestApp::class.java)
        .web(WebApplicationType.NONE)
        .bannerMode(Banner.Mode.OFF)
        .run("--spring.config.additional-location=optional:file:$configFile", *extraArgs)

    /**
     * The timestamp is pushed forward explicitly rather than left to the clock: a rewrite of the
     * same byte count within one filesystem timestamp tick would otherwise look unchanged, which is
     * the case the fingerprint exists to catch.
     */
    private fun writeAndTouch(configFile: Path, content: String) {
        Files.writeString(configFile, content)
        Files.setLastModifiedTime(configFile, FileTime.fromMillis(System.currentTimeMillis() + 10_000))
    }

    private fun ConfigurableApplicationContext.reload() = getBean(ConfigFileReloadService::class.java).reloadChangedConfigFiles()

    @Test
    fun `an edited config file re-binds the injected properties in place`() {
        val configFile = tempDir.resolve("config.yml")
        Files.writeString(
            configFile,
            "tafeladmin:\n  environmentLabel: TEST\n  storage:\n    scannerPath: /mnt/scanner\n    scannerEnabled: true\n",
        )

        start(configFile).use { context ->
            val properties = context.getBean(TafelAdminProperties::class.java)
            val listener = context.getBean(RecordingListener::class.java)
            assertThat(properties.storage.scannerFolderAvailable).isTrue()

            writeAndTouch(
                configFile,
                "tafeladmin:\n  environmentLabel: TEST\n  storage:\n    scannerPath: /mnt/scanner\n    scannerEnabled: false\n",
            )
            context.reload()

            // Same instance, new values - which is what lets every consumer keep its injected bean.
            assertThat(context.getBean(TafelAdminProperties::class.java)).isSameAs(properties)
            assertThat(properties.storage.scannerFolderAvailable).isFalse()
            assertThat(properties.storage.scannerPath).isEqualTo("/mnt/scanner")
            assertThat(properties.environmentLabel).isEqualTo("TEST")
            assertThat(listener.events).hasSize(1)
        }
    }

    @Test
    fun `a key removed from the file falls back to its default instead of keeping the startup value`() {
        val configFile = tempDir.resolve("config.yml")
        Files.writeString(configFile, "tafeladmin:\n  storage:\n    scannerPath: /mnt/scanner\n    scannerEnabled: false\n")

        start(configFile).use { context ->
            val properties = context.getBean(TafelAdminProperties::class.java)
            assertThat(properties.storage.scannerEnabled).isFalse()

            writeAndTouch(configFile, "tafeladmin:\n  storage:\n    scannerPath: /mnt/scanner\n")
            context.reload()

            assertThat(properties.storage.scannerEnabled).isTrue()
        }
    }

    /**
     * `optional:` locations may point at a file that isn't there yet, so the watcher has to find it
     * when it appears rather than only at startup - and let go of it again when it's removed.
     */
    @Test
    fun `a config file removed and re-created after startup is picked up both times`() {
        val configFile = tempDir.resolve("config.yml")
        Files.writeString(configFile, "tafeladmin:\n  environmentLabel: TEST\n")

        start(configFile).use { context ->
            val properties = context.getBean(TafelAdminProperties::class.java)

            Files.delete(configFile)
            context.reload()
            assertThat(properties.environmentLabel).isEmpty()

            writeAndTouch(configFile, "tafeladmin:\n  environmentLabel: BACK\n")
            context.reload()
            assertThat(properties.environmentLabel).isEqualTo("BACK")
        }
    }

    @Test
    fun `reloading can be switched off`() {
        val configFile = tempDir.resolve("config.yml")
        Files.writeString(configFile, "tafeladmin:\n  environmentLabel: TEST\n")

        start(configFile, "--tafeladmin.configReload.enabled=false").use { context ->
            assertThat(context.getBeanNamesForType(ConfigFileReloadService::class.java)).isEmpty()
        }
    }
}
