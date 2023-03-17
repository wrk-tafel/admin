package at.wrk.tafel.admin.backend.modules.base.exception

import io.mockk.impl.annotations.RelaxedMockK
import io.mockk.junit5.MockKExtension
import jakarta.persistence.EntityNotFoundException
import org.assertj.core.api.Assertions.assertThat
import org.junit.jupiter.api.Test
import org.junit.jupiter.api.extension.ExtendWith
import org.springframework.http.HttpStatus
import org.springframework.web.context.request.WebRequest

@ExtendWith(MockKExtension::class)
internal class RestResponseEntityExceptionHandlerTest {

    private val exceptionHandler = RestResponseEntityExceptionHandler()

    @RelaxedMockK
    private lateinit var request: WebRequest

    @Test
    fun `not found exception handled properly`() {
        val response = exceptionHandler.handleEntityNotFoundException(EntityNotFoundException(), request)

        assertThat(response.statusCode).isEqualTo(HttpStatus.NOT_FOUND)
    }

}
