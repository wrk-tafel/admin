package at.wrk.tafel.admin.backend.database.config

import org.springframework.boot.autoconfigure.domain.EntityScan
import org.springframework.context.annotation.Configuration
import org.springframework.data.jpa.repository.config.EnableJpaRepositories

@Configuration
@EnableJpaRepositories("at.wrk.tafel.admin.backend.database.repositories")
@EntityScan("at.wrk.tafel.admin.backend.database.entities")
class DatabaseConfig
