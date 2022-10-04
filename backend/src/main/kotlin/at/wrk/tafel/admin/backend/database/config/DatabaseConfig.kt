package at.wrk.tafel.admin.backend.database.config

import at.wrk.tafel.admin.backend.common.ExcludeFromTestCoverage
import org.flywaydb.core.Flyway
import org.springframework.beans.factory.annotation.Value
import org.springframework.boot.ApplicationArguments
import org.springframework.boot.ApplicationRunner
import org.springframework.boot.autoconfigure.domain.EntityScan
import org.springframework.context.annotation.Configuration
import org.springframework.data.jpa.repository.config.EnableJpaRepositories

@Configuration
@EnableJpaRepositories("at.wrk.tafel.admin.backend.database.repositories")
@EntityScan("at.wrk.tafel.admin.backend.database.entities")
@ExcludeFromTestCoverage
class DatabaseConfig(
    private val flyway: Flyway,
    @Value("\${tafeladmin.testdata.enabled:false}") private val testdataEnabled: Boolean
) : ApplicationRunner {

    override fun run(args: ApplicationArguments) {
        if (testdataEnabled) {
            flyway.clean()
        }

        flyway.migrate()
    }

}
