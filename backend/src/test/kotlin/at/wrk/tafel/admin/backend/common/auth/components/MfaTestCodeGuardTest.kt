package at.wrk.tafel.admin.backend.common.auth.components

import at.wrk.tafel.admin.backend.config.properties.TafelAdminProperties
import org.assertj.core.api.Assertions.assertThat
import org.junit.jupiter.api.Test
import org.junit.jupiter.api.assertThrows
import org.springframework.boot.DefaultApplicationArguments
import org.springframework.mock.env.MockEnvironment

class MfaTestCodeGuardTest {

    private val properties = TafelAdminProperties()
    private val environment = MockEnvironment()
    private val guard = MfaTestCodeGuard(properties, environment)

    @Test
    fun `starts without a fixed code whatever the profile`() {
        environment.setActiveProfiles("prod")

        guard.run(DefaultApplicationArguments())

        assertThat(guard.fixedCode()).isNull()
    }

    @Test
    fun `refuses to start with a fixed code outside the test profiles`() {
        properties.mfa.emailCodeForTests = "424242"
        environment.setActiveProfiles("prod")

        val exception = assertThrows<IllegalStateException> { guard.run(DefaultApplicationArguments()) }

        assertThat(exception.message).contains("emailCodeForTests")
    }

    @Test
    fun `refuses to start with a fixed code and no profile at all`() {
        properties.mfa.emailCodeForTests = "424242"

        assertThrows<IllegalStateException> { guard.run(DefaultApplicationArguments()) }
    }

    @Test
    fun `allows the fixed code in the e2e and the test profile`() {
        properties.mfa.emailCodeForTests = "424242"

        listOf("e2e", "test").forEach { profile ->
            environment.setActiveProfiles(profile)

            guard.run(DefaultApplicationArguments())
            assertThat(guard.fixedCode()).isEqualTo("424242")
        }
    }

    @Test
    fun `ignores a fixed code that appears after startup outside the test profiles`() {
        environment.setActiveProfiles("prod")
        guard.run(DefaultApplicationArguments())

        properties.mfa.emailCodeForTests = "424242"

        assertThat(guard.fixedCode()).isNull()
    }
}
