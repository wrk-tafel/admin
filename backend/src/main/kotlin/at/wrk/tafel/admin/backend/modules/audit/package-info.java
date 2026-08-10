/**
 * Read access to the audit trail - "who changed what, and what did it look like before".
 *
 * This module only ever reads. The writing side deliberately does not live here: it is a Hibernate
 * flush-time listener that has to see every module's writes, so it sits in the shared
 * {@code database.common.audit} layer alongside the entity it fills, exactly like the SSE outbox.
 * A module cannot observe another module's persistence, and making every module depend on this one
 * so it could report its own changes is the coupling the listener exists to avoid. See ADR-0039.
 * <p>
 * Two questions are served: one household's history (the "Verlauf" tab on the customer detail
 * screen) and the whole log, filtered (the administration screen). Both are gated by the
 * {@code AUDIT_LOG} permission.
 */
@org.springframework.modulith.ApplicationModule(
        allowedDependencies = {"base::exception"}
)
package at.wrk.tafel.admin.backend.modules.audit;
