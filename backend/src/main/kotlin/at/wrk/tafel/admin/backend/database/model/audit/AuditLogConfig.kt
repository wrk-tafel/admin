package at.wrk.tafel.admin.backend.database.model.audit

import at.wrk.tafel.admin.backend.common.auth.model.TafelJwtAuthentication
import org.springframework.context.annotation.Bean
import org.springframework.context.annotation.Configuration
import org.springframework.data.domain.AuditorAware
import org.springframework.data.jpa.repository.config.EnableJpaAuditing
import org.springframework.security.core.context.SecurityContextHolder
import java.util.*

@Configuration
@EnableJpaAuditing(auditorAwareRef = "auditorProvider")
class AuditLogConfig {

    @Bean
    fun auditorProvider(): AuditorAware<String> {
        return AuditorAware {
            val authenticatedUser = SecurityContextHolder.getContext().authentication as? TafelJwtAuthentication
            Optional.ofNullable(authenticatedUser?.fullName)
        }
    }

}
