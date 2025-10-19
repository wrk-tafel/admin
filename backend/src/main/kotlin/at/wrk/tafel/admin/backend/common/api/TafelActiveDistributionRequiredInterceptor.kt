package at.wrk.tafel.admin.backend.common.api

import at.wrk.tafel.admin.backend.database.model.distribution.DistributionRepository
import at.wrk.tafel.admin.backend.database.model.distribution.getCurrentDistribution
import at.wrk.tafel.admin.backend.modules.base.exception.TafelValidationException
import jakarta.servlet.http.HttpServletRequest
import jakarta.servlet.http.HttpServletResponse
import org.springframework.stereotype.Component
import org.springframework.web.method.HandlerMethod
import org.springframework.web.servlet.HandlerInterceptor
import org.springframework.web.servlet.ModelAndView

@Component
class TafelActiveDistributionRequiredInterceptor(
    private val distributionRepository: DistributionRepository
) : HandlerInterceptor {

    override fun preHandle(request: HttpServletRequest, response: HttpServletResponse, handler: Any): Boolean {
        if (handler is HandlerMethod) {
            // Check if the method or class has our annotation
            val methodAnnotation = handler.method.getAnnotation(TafelActiveDistributionRequired::class.java)
            val classAnnotation = handler.beanType.getAnnotation(TafelActiveDistributionRequired::class.java)

            if (methodAnnotation != null || classAnnotation != null) {
                // Check if an active distribution exists
                if (distributionRepository.getCurrentDistribution() == null) {
                    throw TafelValidationException("Ausgabe nicht gestartet!")
                }
            }
        }
        return true
    }

    override fun postHandle(
        request: HttpServletRequest,
        response: HttpServletResponse,
        handler: Any,
        modelAndView: ModelAndView?
    ) {
        // Nothing to do here
    }

    override fun afterCompletion(
        request: HttpServletRequest,
        response: HttpServletResponse,
        handler: Any,
        ex: Exception?
    ) {
        // Nothing to do here
    }

}
