package at.wrk.tafel.admin.backend.database.common.audit

import at.wrk.tafel.admin.backend.common.ExcludeFromTestCoverage
import org.springframework.beans.factory.ObjectProvider
import org.springframework.boot.hibernate.autoconfigure.HibernatePropertiesCustomizer
import org.springframework.context.annotation.Bean
import org.springframework.context.annotation.Configuration

/**
 * Hands [AuditTransactionInterceptor] to Hibernate.
 *
 * Unlike the event listeners (see [AuditListenerRegistrar]), an interceptor cannot be attached to a
 * finished session factory - it has to be part of the configuration the factory is built from, which
 * is what this customizer does.
 */
@Configuration
@ExcludeFromTestCoverage
class AuditHibernateConfig {

    companion object {
        private const val HIBERNATE_INTERCEPTOR_PROPERTY = "hibernate.session_factory.interceptor"
    }

    @Bean
    fun auditHibernatePropertiesCustomizer(auditLogWriter: ObjectProvider<AuditLogWriter>): HibernatePropertiesCustomizer = HibernatePropertiesCustomizer { properties ->
        properties[HIBERNATE_INTERCEPTOR_PROPERTY] = AuditTransactionInterceptor(auditLogWriter)
    }
}
