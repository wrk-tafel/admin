# ADR-0075: Password hashes use OWASP's minimum Argon2id cost and a bounded number of slots

**Status:** accepted · **Recorded:** 2026-11-01

## Context

Every password is hashed with Argon2id (`WebSecurityConfig.passwordEncoder`, Spring's
`Argon2PasswordEncoder`, which is BouncyCastle's pure-Java implementation). The parameters were 128 MiB
of memory and 3 passes - about 13 times the work of the minimum the
[OWASP Password Storage Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Password_Storage_Cheat_Sheet.html#argon2id)
recommends (19 MiB, 2 passes, 1 lane).

The cost is paid on every login, including a login for an unknown username, which `TafelLoginProvider`
hashes against a fallback so that it takes as long as a wrong password. Measured on the same encoder
(issue [#3914](https://github.com/wrk-tafel/admin/issues/3914)): one hash at 128 MiB / 3 passes took
263 ms on a developer machine and about 0.7 s on a server with 2 shared vCPUs, against 19 ms at OWASP's
minimum. And an Argon2 hash holds its whole `memory` on the JVM heap while it runs. Nothing bounded how
many ran at once, so the heap a busy moment needed was `128 MiB × concurrent logins`; in a fork of this
code base, five logins at the same moment ended a 768 MB heap in `OutOfMemoryError`. Logins arriving
faster than they could be hashed queued, each holding a request thread.

Logins here cluster: volunteers sign in at the start of a distribution day, often on shared machines.

## Decision

- **Argon2id at OWASP's minimum: 19 MiB, 2 passes, 1 lane** (`security.argon2` in `application.yml`,
  defaults in `SecurityArgon2Properties`).
- **Existing hashes move onto the new parameters on the user's next successful login, whichever way the
  parameters changed.** Spring's `upgradeEncoding` only reports a hash as outdated when its parameters
  are *weaker* than the configured ones, so on its own every 128 MiB hash would keep its cost until the
  password changed. `TafelArgon2PasswordEncoder` reports any difference in memory, passes or lanes, and
  `TafelLoginProvider` re-hashes as it already did for weaker hashes.
- **At most `maxConcurrentHashes` (4) hashes run at once per instance.** `BoundedPasswordEncoder` wraps the
  encoder in a fair semaphore; a caller that gets no slot within `maxWaitInSeconds` (5) is answered with
  `503` and `Retry-After` - from `TafelLoginFilter` for a login, from `GenericExceptionHandler` for a
  password change, reset or new account. A login answered that way is not counted as a failed attempt.
  The heap password hashing can take is now bounded at `4 × 19 MiB`.

## Consequences

- An attacker who has stolen the `users` table can test about 13 times as many guesses per second per
  hash as before. That is still within what OWASP considers sufficient for Argon2id, and the online
  attack surface is unchanged: it is limited by the login lockouts (`LoginAttemptService`,
  `LoginAttemptIpService`), not by the hash cost.
- The first login of every user after the deploy re-hashes their password and saves it. Like every
  password write, that is recorded in the audit trail as a change of the (redacted) `password` field of
  the user, without the user having changed anything.
- Under a burst larger than 4 slots can work through in 5 seconds, a login gets a `503` instead of
  waiting indefinitely. The login page shows its "Server nicht erreichbar ... erneut versuchen" message for
  it. At about 20-50 ms per hash that is a burst of several hundred logins within seconds - far beyond
  what this application sees, which is why the bound exists for safety rather than as a regular path.
- The semaphore is per instance. During a deploy, two instances run side by side, each with its own 4
  slots.

## Alternatives considered

- **Keep 128 MiB / 3 passes and only bound concurrency.** Bounds the heap, but every login still costs
  0.7 s of CPU on the production server, and a slot-bound queue at that cost turns a distribution
  morning's logins into waits of seconds.
- **Lower the parameters but keep Spring's upgrade check.** Nothing to write, but the users who exist at
  the deploy - nearly all of them - would keep paying the old cost until each changes their password.
- **Bound concurrency through the servlet container's thread pool or the rate limiter.** Neither knows
  which request is about to hash: a thread limit throttles every request, and `RateLimitFilter` counts
  per IP, while the logins of a distribution day share the site's few IP addresses.

## References

- Issue [#3914](https://github.com/wrk-tafel/admin/issues/3914)
- `backend/src/main/kotlin/at/wrk/tafel/admin/backend/common/auth/components/TafelArgon2PasswordEncoder.kt`
- `backend/src/main/kotlin/at/wrk/tafel/admin/backend/common/auth/components/BoundedPasswordEncoder.kt`
- `backend/src/main/kotlin/at/wrk/tafel/admin/backend/common/auth/components/TafelLoginProvider.kt`
- `backend/src/main/kotlin/at/wrk/tafel/admin/backend/config/properties/ApplicationProperties.kt` (`SecurityArgon2Properties`)
