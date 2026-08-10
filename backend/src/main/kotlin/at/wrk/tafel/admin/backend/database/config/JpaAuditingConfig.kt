package at.wrk.tafel.admin.backend.database.config

import at.wrk.tafel.admin.backend.common.ExcludeFromTestCoverage
import at.wrk.tafel.admin.backend.database.common.audit.AuditActorProvider
import org.springframework.context.annotation.Bean
import org.springframework.context.annotation.Configuration
import org.springframework.data.domain.AuditorAware
import org.springframework.data.jpa.repository.config.EnableJpaAuditing
import java.util.Optional

/**
 * Fills `created_by`/`updated_by` on every entity extending `BaseChangeTrackingEntity`.
 *
 * Only the *actor* half of Spring Data's auditing is used - the timestamps stay on Hibernate's
 * `@CreationTimestamp`/`@UpdateTimestamp`, which already fill `created_at`/`updated_at` and predate
 * this. Mixing in `@CreatedDate`/`@LastModifiedDate` would mean two mechanisms writing the same two
 * columns.
 */
@Configuration
@EnableJpaAuditing(auditorAwareRef = "auditorProvider")
@ExcludeFromTestCoverage
class JpaAuditingConfig {

    @Bean
    fun auditorProvider(auditActorProvider: AuditActorProvider): AuditorAware<String> = AuditorAware { Optional.ofNullable(auditActorProvider.currentUsername()) }
}
