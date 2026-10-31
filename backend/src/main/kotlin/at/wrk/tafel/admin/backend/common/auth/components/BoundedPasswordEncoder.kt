package at.wrk.tafel.admin.backend.common.auth.components

import at.wrk.tafel.admin.backend.modules.base.exception.TafelApiException
import org.slf4j.LoggerFactory
import org.springframework.http.HttpHeaders
import org.springframework.http.HttpStatus
import org.springframework.security.crypto.password.PasswordEncoder
import java.util.concurrent.Semaphore
import java.util.concurrent.TimeUnit

/**
 * Bounds how many password hashes this instance computes at the same time. An Argon2 hash holds its
 * whole `memory` parameter on the heap while it runs and keeps a request thread busy for its whole
 * duration, so without a bound a burst of logins - including logins for unknown usernames, which
 * `TafelLoginProvider` hashes against a fallback - decides on its own how much heap and how many
 * threads they take (ADR-0075).
 *
 * The semaphore is fair, so hashes are computed in arrival order. A caller that gets no slot within
 * [maxWaitInSeconds] is answered with [PasswordHashingBusyException] - a `503` with `Retry-After`,
 * from `GenericExceptionHandler` or, for a login, from `TafelLoginFilter`.
 *
 * Only [encode] and [matches] hash; [upgradeEncoding] only reads the stored hash's parameters.
 */
class BoundedPasswordEncoder(
    private val delegate: PasswordEncoder,
    maxConcurrentHashes: Int,
    private val maxWaitInSeconds: Long,
) : PasswordEncoder {

    companion object {
        private val log = LoggerFactory.getLogger(BoundedPasswordEncoder::class.java)
    }

    private val permits = Semaphore(maxConcurrentHashes, true)

    override fun encode(rawPassword: CharSequence?): String? = bounded { delegate.encode(rawPassword) }

    override fun matches(rawPassword: CharSequence?, encodedPassword: String?): Boolean = bounded { delegate.matches(rawPassword, encodedPassword) }

    override fun upgradeEncoding(encodedPassword: String?): Boolean = delegate.upgradeEncoding(encodedPassword)

    private fun <T> bounded(hash: () -> T): T {
        if (!permits.tryAcquire(maxWaitInSeconds, TimeUnit.SECONDS)) {
            log.warn("No password hashing slot became free within {}s - answering 503", maxWaitInSeconds)
            throw PasswordHashingBusyException(maxWaitInSeconds)
        }
        try {
            return hash()
        } finally {
            permits.release()
        }
    }
}

/**
 * Every password hashing slot stayed taken for as long as a caller may wait for one
 * ([BoundedPasswordEncoder]). Temporary by nature, hence `503` with a `Retry-After` of the same wait.
 */
class PasswordHashingBusyException(
    val retryAfterInSeconds: Long,
) : TafelApiException(
    HttpStatus.SERVICE_UNAVAILABLE,
    "Es melden sich gerade sehr viele Benutzer gleichzeitig an. Bitte in einigen Sekunden erneut versuchen.",
) {
    init {
        headers.set(HttpHeaders.RETRY_AFTER, retryAfterInSeconds.toString())
    }
}
