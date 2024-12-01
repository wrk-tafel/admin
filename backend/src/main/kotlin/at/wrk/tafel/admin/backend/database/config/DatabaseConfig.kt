package at.wrk.tafel.admin.backend.database.config

import at.wrk.tafel.admin.backend.common.ExcludeFromTestCoverage
import org.springframework.boot.autoconfigure.domain.EntityScan
import org.springframework.context.annotation.Configuration
import org.springframework.data.jpa.repository.config.EnableJpaRepositories

@Configuration
@EnableJpaRepositories("at.wrk.tafel.admin.backend.database.model")
@EntityScan("at.wrk.tafel.admin.backend.database.model")
@ExcludeFromTestCoverage
class DatabaseConfig
