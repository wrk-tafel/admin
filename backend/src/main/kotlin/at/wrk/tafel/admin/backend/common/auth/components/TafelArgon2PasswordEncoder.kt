package at.wrk.tafel.admin.backend.common.auth.components

import org.springframework.security.crypto.argon2.Argon2PasswordEncoder

/**
 * Spring's [Argon2PasswordEncoder], except that a stored hash counts as outdated whenever its
 * memory, iteration or parallelism parameters differ from the configured ones - not only when they
 * are *weaker*, which is all Spring's own `upgradeEncoding` checks.
 *
 * The difference matters when the parameters are lowered (ADR-0075): with Spring's check, every
 * hash created under the old, more expensive parameters would keep its cost until the user's
 * password changed, so nearly every login would go on paying it. Here such a hash is re-created on
 * the user's next successful login, like any other outdated one (see
 * `TafelLoginProvider.additionalAuthenticationChecks`).
 */
class TafelArgon2PasswordEncoder(
    saltLength: Int,
    hashLength: Int,
    private val parallelism: Int,
    private val memory: Int,
    private val iterations: Int,
) : Argon2PasswordEncoder(saltLength, hashLength, parallelism, memory, iterations) {

    companion object {
        // $argon2id$v=19$m=19456,t=2,p=1$<salt>$<hash> - the PHC string Argon2PasswordEncoder writes
        private val PARAMETERS = Regex("^\\\$argon2(?:id|i|d)\\\$v=\\d+\\\$m=(\\d+),t=(\\d+),p=(\\d+)\\\$")
    }

    override fun upgradeEncodingNonNull(encodedPassword: String): Boolean {
        val match = PARAMETERS.find(encodedPassword) ?: return super.upgradeEncodingNonNull(encodedPassword)
        val (storedMemory, storedIterations, storedParallelism) = match.destructured
        return storedMemory.toInt() != memory ||
            storedIterations.toInt() != iterations ||
            storedParallelism.toInt() != parallelism ||
            super.upgradeEncodingNonNull(encodedPassword)
    }
}
