package at.wrk.tafel.admin.backend.config

import at.wrk.tafel.admin.backend.common.ExcludeFromTestCoverage
import net.javacrumbs.shedlock.core.DefaultLockingTaskExecutor
import net.javacrumbs.shedlock.core.LockProvider
import net.javacrumbs.shedlock.core.LockingTaskExecutor
import net.javacrumbs.shedlock.provider.jdbctemplate.JdbcTemplateLockProvider
import net.javacrumbs.shedlock.spring.annotation.EnableSchedulerLock
import org.springframework.context.annotation.Bean
import org.springframework.context.annotation.Configuration
import org.springframework.jdbc.core.JdbcTemplate
import javax.sql.DataSource

/**
 * Makes a `@Scheduled` job that must not run twice run once per cluster, rather than once per
 * instance.
 *
 * Only the jobs with nothing of their own to claim are locked here: a notification, a filesystem
 * scan. Everything that works through rows coordinates on those rows instead, with
 * `FOR UPDATE SKIP LOCKED` - which is strictly better where it applies, because two instances then
 * share the work out rather than one standing idle. See the mail outbox (ADR-0045) and the retention
 * cleanups' repositories for that half, and ADR-0047 for why the split falls where it does.
 *
 * Deliberately not built on [at.wrk.tafel.admin.backend.database.common.lock.AdvisoryLockService],
 * the mechanism the rest of the application locks with. Advisory locks here are transaction-scoped,
 * so using one as leader election means holding a transaction - and therefore a pooled connection -
 * for the whole job. That trips Hikari's 60s leak detector on every run of anything slow, pins the
 * vacuum horizon while the job does no database work at all, and ties the lock's lifetime to a TCP
 * connection: a dropped connection releases it mid-job and lets a second instance start the same
 * work. ShedLock instead commits a short claim, hands the connection back, and runs the job holding
 * nothing.
 *
 * [JdbcTemplateLockProvider] is configured `usingDbTime`, so `lock_until` is written and compared by
 * the database's clock. Without it every instance would judge the lock by its own clock, and the
 * daily jobs - whose real risk is two instances firing seconds apart, not overlapping - would be
 * guarded by the very thing that can be wrong.
 */
@Configuration
@EnableSchedulerLock(defaultLockAtMostFor = SchedulerLockConfig.DEFAULT_LOCK_AT_MOST_FOR)
@ExcludeFromTestCoverage
class SchedulerLockConfig {

    @Bean
    fun lockProvider(dataSource: DataSource): LockProvider = JdbcTemplateLockProvider(
        JdbcTemplateLockProvider.Configuration.builder()
            .withJdbcTemplate(JdbcTemplate(dataSource))
            .usingDbTime()
            .build(),
    )

    /**
     * For the one job that cannot take its lock through `@SchedulerLock`: the scanner-folder watcher
     * has to decide whether the feature is switched on at all before it touches the database, and an
     * annotation runs before the method body (see `DocumentScannerWatcherService`).
     */
    @Bean
    fun lockingTaskExecutor(lockProvider: LockProvider): LockingTaskExecutor = DefaultLockingTaskExecutor(lockProvider)

    companion object {
        /**
         * The backstop for a job whose instance dies while holding the lock - it is released this
         * long after it was taken, whatever happened to the holder. Every job here sets its own
         * `lockAtMostFor` anyway; this only bounds one that forgets to.
         */
        const val DEFAULT_LOCK_AT_MOST_FOR = "PT10M"
    }
}
