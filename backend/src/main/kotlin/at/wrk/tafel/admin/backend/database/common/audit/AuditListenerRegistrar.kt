package at.wrk.tafel.admin.backend.database.common.audit

import jakarta.persistence.EntityManagerFactory
import org.hibernate.engine.spi.SessionFactoryImplementor
import org.hibernate.event.spi.EventType
import org.slf4j.LoggerFactory
import org.springframework.beans.factory.InitializingBean
import org.springframework.stereotype.Component

/**
 * Hooks [AuditEventListener] into the session factory.
 *
 * Hibernate instantiates event listeners itself, which would leave one unable to reach a repository
 * or the `SecurityContext`; appending an already-built Spring bean to the registry is what keeps
 * the listener an ordinary injectable component.
 *
 * Runs as `afterPropertiesSet` rather than on an application event so the listener is in place
 * before anything can write - `ApplicationRunner`s such as `InitialAdminUserService` create rows
 * during startup, and a listener registered after them would silently miss those.
 */
@Component
class AuditListenerRegistrar(
    private val entityManagerFactory: EntityManagerFactory,
    private val auditEventListener: AuditEventListener,
) : InitializingBean {

    companion object {
        private val logger = LoggerFactory.getLogger(AuditListenerRegistrar::class.java)
    }

    override fun afterPropertiesSet() {
        val registry = entityManagerFactory
            .unwrap(SessionFactoryImplementor::class.java)
            .eventEngine
            .listenerRegistry

        registry.appendListeners(EventType.POST_INSERT, auditEventListener)
        registry.appendListeners(EventType.POST_UPDATE, auditEventListener)
        registry.appendListeners(EventType.POST_DELETE, auditEventListener)

        logger.info("Audit trail listener registered for: {}", AuditScope.allEntityTypes.joinToString(", "))
    }
}
