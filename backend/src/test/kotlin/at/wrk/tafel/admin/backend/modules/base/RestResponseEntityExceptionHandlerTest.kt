package at.wrk.tafel.admin.backend.modules.base

import org.assertj.core.api.Assertions.assertThat
import org.junit.jupiter.api.Test
import org.springframework.http.HttpStatus

internal class RestResponseEntityExceptionHandlerTest {

    private val exceptionHandler = RestResponseEntityExceptionHandler()

    @Test
    fun `not found exception handled properly`() {
        val response = exceptionHandler.handleEntityNotFoundException(null, null)

        assertThat(response.statusCode).isEqualTo(HttpStatus.NOT_FOUND)
    }

}
