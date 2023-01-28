package at.wrk.tafel.admin.backend.common.auth.websocket

import at.wrk.tafel.admin.backend.common.auth.model.TafelJwtAuthentication
import org.springframework.core.MethodParameter
import org.springframework.core.annotation.AnnotationUtils
import org.springframework.messaging.Message
import org.springframework.messaging.handler.invocation.HandlerMethodArgumentResolver
import org.springframework.messaging.simp.stomp.StompHeaderAccessor
import org.springframework.security.core.annotation.AuthenticationPrincipal

class TafelWebSocketAuthPrincipalArgumentResolver : HandlerMethodArgumentResolver {

    override fun supportsParameter(parameter: MethodParameter): Boolean {
        return findMethodAnnotation(AuthenticationPrincipal::class.java, parameter) != null
    }

    override fun resolveArgument(parameter: MethodParameter, message: Message<*>): TafelJwtAuthentication? {
        return message.headers[StompHeaderAccessor.USER_HEADER] as TafelJwtAuthentication
    }

    /**
     * Obtains the specified [Annotation] on the specified [MethodParameter].
     *
     * @param annotationClass the class of the [Annotation] to find on the
     * [MethodParameter]
     * @param parameter       the [MethodParameter] to search for an [Annotation]
     * @return the [Annotation] that was found or null.
     */
    private fun <T : Annotation?> findMethodAnnotation(annotationClass: Class<T>, parameter: MethodParameter): T? {
        var annotation = parameter.getParameterAnnotation(annotationClass)
        if (annotation != null) {
            return annotation
        }
        val annotationsToSearch = parameter.parameterAnnotations
        for (toSearch in annotationsToSearch) {
            annotation = AnnotationUtils.findAnnotation<T>(toSearch.annotationClass.java, annotationClass)
            if (annotation != null) {
                return annotation
            }
        }
        return null
    }

}
