package at.wrk.tafel.admin.backend.common.api

import at.wrk.tafel.admin.backend.database.model.distribution.DistributionRepository
import at.wrk.tafel.admin.backend.database.model.distribution.getCurrentDistribution
import at.wrk.tafel.admin.backend.modules.base.exception.TafelValidationException
import at.wrk.tafel.admin.backend.modules.distribution.internal.testDistributionEntity
import io.mockk.every
import io.mockk.mockk
import jakarta.servlet.http.HttpServletRequest
import jakarta.servlet.http.HttpServletResponse
import org.assertj.core.api.Assertions.assertThat
import org.junit.jupiter.api.Assertions.assertTrue
import org.junit.jupiter.api.Test
import org.junit.jupiter.api.assertThrows
import org.springframework.web.method.HandlerMethod

class ActiveDistributionRequiredInterceptorTest {

    private val distributionRepository = mockk<DistributionRepository>()
    private val interceptor = TafelActiveDistributionRequiredInterceptor(distributionRepository)
    private val request = mockk<HttpServletRequest>()
    private val response = mockk<HttpServletResponse>()

    @Test
    fun `preHandle returns true if no annotation present`() {
        val handler = mockk<Any>()
        val result = interceptor.preHandle(request, response, handler)
        assertTrue(result)
    }

    @Test
    fun `preHandle throws exception if annotation present and no active distribution`() {
        val handlerMethod = mockk<HandlerMethod>()
        val method = this::class.java.getDeclaredMethod("annotatedMethod")
        every { handlerMethod.method } returns method
        every { handlerMethod.beanType } returns this::class.java
        every { distributionRepository.findFirstByOrderByIdDesc() } returns null

        val exception = assertThrows<TafelValidationException> {
            interceptor.preHandle(request, response, handlerMethod)
        }
        assertThat(exception.message).isEqualTo("Ausgabe nicht gestartet!")
    }

    @Test
    fun `preHandle returns true if annotation present and active distribution exists`() {
        val handlerMethod = mockk<HandlerMethod>()
        val method = this::class.java.getDeclaredMethod("annotatedMethod")
        every { handlerMethod.method } returns method
        every { handlerMethod.beanType } returns this::class.java
        every { distributionRepository.findFirstByOrderByIdDesc() } returns testDistributionEntity

        val result = interceptor.preHandle(request, response, handlerMethod)
        assertTrue(result)
    }

    @TafelActiveDistributionRequired
    fun annotatedMethod() {
    }

}
