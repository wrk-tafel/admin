package at.wrk.tafel.admin.backend.modules.base.exception

import at.wrk.tafel.admin.backend.TafelBaseIntegrationTest
import org.junit.jupiter.api.BeforeEach
import org.junit.jupiter.api.Test
import org.springframework.beans.factory.annotation.Autowired
import org.springframework.http.MediaType
import org.springframework.security.test.context.support.WithMockUser
import org.springframework.test.web.servlet.MockMvc
import org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete
import org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post
import org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put
import org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath
import org.springframework.test.web.servlet.result.MockMvcResultMatchers.status
import org.springframework.test.web.servlet.setup.MockMvcBuilders
import org.springframework.web.context.WebApplicationContext

/**
 * Exercises [GenericExceptionHandler] through the real `DispatcherServlet` and the real
 * `MessageSource`, which is the only level at which issue #3008 was visible: the exceptions below are
 * raised by Spring's own request-handling machinery (argument resolution, content negotiation,
 * handler mapping) and answered by handlers inherited from `ResponseEntityExceptionHandler`, so a
 * unit test calling `handleExceptionInternal` directly can neither produce them in their real call
 * shape nor see what an unresolved `problemDetail.<exception class>` message code does to the body.
 *
 * That is exactly how the bug shipped: `messageSource.useCodeAsDefaultMessage = true` turned Spring's
 * deliberately-optional `problemDetail.*` lookups into hits, so the raw message code was rendered as
 * the user-facing `detail` (and as the problem `type` URI). `/api/cars` is used purely as a
 * convenient real endpoint - none of these requests ever reach the controller or the database.
 *
 * MockMvc is built from the `WebApplicationContext` directly instead of via `@AutoConfigureMockMvc`,
 * which lives in a Boot module this project doesn't depend on. The security filter chain is therefore
 * not in play (method security still is, hence [WithMockUser]) - fine here, since every failure below
 * happens before the controller is invoked.
 */
@WithMockUser(authorities = ["SETTINGS"])
class GenericExceptionHandlerIT : TafelBaseIntegrationTest() {

    @Autowired
    private lateinit var webApplicationContext: WebApplicationContext

    private lateinit var mockMvc: MockMvc

    @BeforeEach
    fun beforeEach() {
        mockMvc = MockMvcBuilders.webAppContextSetup(webApplicationContext).build()
    }

    @Test
    fun `malformed request body is answered with a readable german detail instead of a message code`() {
        mockMvc.perform(
            post("/api/cars")
                .contentType(MediaType.APPLICATION_JSON)
                .content("{ not json"),
        )
            .andExpect(status().isBadRequest)
            .andExpect(jsonPath("$.title").value("Ungültige Aktion"))
            .andExpect(jsonPath("$.detail").value("Die Anfrage war ungültig oder unvollständig."))
            // the unresolved code used to be rendered as the problem type as well
            // ("problemDetail.type.org.springframework...."); a type left at its "about:blank"
            // default is omitted from the body entirely
            .andExpect(jsonPath("$.type").doesNotExist())
    }

    @Test
    fun `unsupported request method is answered with a readable german detail`() {
        mockMvc.perform(delete("/api/cars"))
            .andExpect(status().isMethodNotAllowed)
            // 405 had no http-error.<status>.title entry at all, so the title used to be the raw
            // "http-error.405.title" key
            .andExpect(jsonPath("$.title").value("Aktion nicht erlaubt"))
            .andExpect(jsonPath("$.detail").value("Diese Aktion ist für diese Adresse nicht erlaubt."))
    }

    @Test
    fun `unsupported content type is answered with a readable german detail`() {
        mockMvc.perform(
            post("/api/cars")
                .contentType(MediaType.TEXT_PLAIN)
                .content("some-text"),
        )
            .andExpect(status().isUnsupportedMediaType)
            .andExpect(jsonPath("$.title").value("Format nicht unterstützt"))
            .andExpect(jsonPath("$.detail").value("Das Format der Anfrage wird nicht unterstützt."))
    }

    @Test
    fun `path variable of the wrong type is answered with a readable german detail`() {
        mockMvc.perform(
            put("/api/cars/not-a-number")
                .contentType(MediaType.APPLICATION_JSON)
                .content("""{"id":null,"licensePlate":"W-1234","name":"Bus","enabled":true,"sortOrder":1}"""),
        )
            .andExpect(status().isBadRequest)
            .andExpect(jsonPath("$.detail").value("Die Anfrage war ungültig oder unvollständig."))
    }

    @Test
    fun `bean validation failure keeps its own wording and the structured field errors`() {
        mockMvc.perform(
            post("/api/cars")
                .contentType(MediaType.APPLICATION_JSON)
                .content("""{"id":null,"licensePlate":"","name":"","enabled":true,"sortOrder":1}"""),
        )
            .andExpect(status().isBadRequest)
            .andExpect(jsonPath("$.title").value("Ungültige Aktion"))
            .andExpect(jsonPath("$.detail").value("Validierung fehlgeschlagen"))
            .andExpect(jsonPath("$.errors.length()").value(2))
    }
}
