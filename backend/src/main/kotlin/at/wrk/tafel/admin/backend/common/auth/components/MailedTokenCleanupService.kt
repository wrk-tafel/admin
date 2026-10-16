package at.wrk.tafel.admin.backend.common.auth.components

import at.wrk.tafel.admin.backend.database.model.auth.EmailChangeTokenRepository
import at.wrk.tafel.admin.backend.database.model.auth.PasswordResetTokenRepository
import org.slf4j.LoggerFactory
import org.springframework.scheduling.annotation.Scheduled
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional
import java.time.Clock
import java.time.LocalDateTime
import java.util.concurrent.TimeUnit

/**
 * Deletes the tokens behind mailed links once they are worth nothing - expired or used (ADR-0072).
 * Claims its rows with `SKIP LOCKED`, so a second instance shares the work (ADR-0047).
 */
@Service
class MailedTokenCleanupService(
    private val passwordResetTokenRepository: PasswordResetTokenRepository,
    private val emailChangeTokenRepository: EmailChangeTokenRepository,
    private val clock: Clock,
) {
    companion object {
        private val logger = LoggerFactory.getLogger(MailedTokenCleanupService::class.java)
    }

    @Scheduled(fixedDelay = 1, timeUnit = TimeUnit.HOURS)
    @Transactional
    fun cleanup() {
        val now = LocalDateTime.now(clock)
        val passwordResets = passwordResetTokenRepository.deleteAllExpiredOrUsedSkipLocked(now)
        val emailChanges = emailChangeTokenRepository.deleteAllExpiredSkipLocked(now)
        if (passwordResets > 0 || emailChanges > 0) {
            logger.info("Removed {} expired or used password reset tokens and {} expired e-mail changes", passwordResets, emailChanges)
        }
    }
}
