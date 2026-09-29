package at.wrk.tafel.admin.backend.common.sse

import io.mockk.every
import io.mockk.mockk
import io.mockk.verify
import org.assertj.core.api.Assertions.assertThat
import org.assertj.core.api.Assertions.assertThatThrownBy
import org.junit.jupiter.api.AfterEach
import org.junit.jupiter.api.BeforeEach
import org.junit.jupiter.api.Test
import org.springframework.security.access.AccessDeniedException
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken
import org.springframework.security.core.authority.SimpleGrantedAuthority
import org.springframework.security.core.context.SecurityContextHolder
import org.springframework.web.server.ResponseStatusException
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter

internal class SseEventsControllerTest {

    private val emitter = mockk<SseEmitter>(relaxed = true)
    private val sseEmitterFactory = mockk<SseEmitterFactory> { every { createSseEmitter() } returns emitter }

    private val open = topic("distribution")
    private val restricted = topic("scanner-files", setOf("CUSTOMER_DOCUMENTS"))
    private val controller = SseEventsController(listOf(open, restricted), sseEmitterFactory)

    private fun topic(topicName: String, authorities: Set<String> = emptySet()) = mockk<SseTopic>(relaxed = true) {
        every { name } returns topicName
        every { requiredAuthorities } returns authorities
    }

    @BeforeEach
    fun beforeEach() = signIn("SCANNER")

    @AfterEach
    fun afterEach() = SecurityContextHolder.clearContext()

    private fun signIn(vararg authorities: String) {
        SecurityContextHolder.getContext().authentication = UsernamePasswordAuthenticationToken(
            "user",
            "pw",
            authorities.map { SimpleGrantedAuthority(it) },
        )
    }

    @Test
    fun `subscribes the emitter to every requested topic and hands over the argument`() {
        signIn("CUSTOMER_DOCUMENTS")

        val result = controller.listen(listOf("distribution", "scanner-files:5"))

        assertThat(result).isSameAs(emitter)
        verify { open.subscribe(emitter, null) }
        verify { restricted.subscribe(emitter, "5") }
    }

    @Test
    fun `an unknown topic is a bad request`() {
        assertThatThrownBy { controller.listen(listOf("nope")) }
            .isInstanceOf(ResponseStatusException::class.java)
            .hasMessageContaining("Unbekanntes Thema")
    }

    @Test
    fun `a topic the caller lacks the authority for refuses the whole stream`() {
        assertThatThrownBy { controller.listen(listOf("distribution", "scanner-files")) }
            .isInstanceOf(AccessDeniedException::class.java)

        verify(exactly = 0) { open.subscribe(any(), any()) }
    }

    @Test
    fun `asking for no topic is a bad request`() {
        assertThatThrownBy { controller.listen(emptyList()) }.isInstanceOf(ResponseStatusException::class.java)
    }

    @Test
    fun `the same topic asked twice is subscribed once`() {
        controller.listen(listOf("distribution", "distribution"))

        verify(exactly = 1) { open.subscribe(emitter, null) }
    }

    @Test
    fun `two topics with the same name are refused at startup`() {
        assertThatThrownBy { SseEventsController(listOf(open, topic("distribution")), sseEmitterFactory) }
            .isInstanceOf(IllegalStateException::class.java)
    }
}
