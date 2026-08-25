/**
 * A central screen for a GDPR Art. 15/17/20 data-subject request (issue #3396): one search box
 * across households, user accounts and employees without one, then export or delete the matching
 * record(s) - reusing the household/user/employee export (issues #3179/#3363/#3394) and delete
 * flows those areas already own, rather than a new export format or a new deletion path. Behind the
 * {@code DATA_SUBJECT_REQUESTS} permission, additive to each area's own permission: it only grants
 * reaching the search and picking a match, the export/delete action itself still requires
 * {@code CUSTOMER}, {@code USER_MANAGEMENT} or {@code SETTINGS} respectively.
 */
@org.springframework.modulith.ApplicationModule(
        allowedDependencies = {"household", "base::employee", "base::exception"}
)
package at.wrk.tafel.admin.backend.modules.datasubjectrequest;
