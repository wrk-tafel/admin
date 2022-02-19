package at.wrk.tafel.admin.backend.dbmodel.config

import org.springframework.boot.autoconfigure.domain.EntityScan
import org.springframework.context.annotation.Configuration
import org.springframework.data.jpa.repository.config.EnableJpaRepositories

@Configuration
@EnableJpaRepositories("at.wrk.tafel.admin.backend.repositories")
@EntityScan("at.wrk.tafel.admin.backend.entities")
class DatabaseConfig
