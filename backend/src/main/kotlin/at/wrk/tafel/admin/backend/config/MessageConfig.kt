package at.wrk.tafel.admin.backend.config

import org.springframework.context.MessageSource
import org.springframework.context.annotation.Bean
import org.springframework.context.annotation.Configuration
import org.springframework.context.support.ReloadableResourceBundleMessageSource

@Configuration
class MessageConfig {

    /**
     * `useCodeAsDefaultMessage` is deliberately left at its `false` default: with it enabled, an
     * unresolved code is returned *as the message*, and Spring's own error handling probes a whole
     * family of optional codes it fully expects to be absent - `ErrorResponse.updateAndGetBody()`
     * and `ResponseEntityExceptionHandler.createProblemDetail()` look up
     * `problemDetail[.type|.title].<exception class>` with a `null` default and only apply the
     * result when one is actually configured. Enabling the flag turned every one of those misses
     * into a hit, so the raw code ended up in the response body a user sees
     * (`"detail": "problemDetail.org.springframework.http.converter.HttpMessageNotReadableException"`,
     * plus the same string as the problem `type` URI) - see issue #3008.
     *
     * The flip side is that a missing key now yields `null`/`NoSuchMessageException` instead of the
     * key itself, so every lookup needs an explicit fallback; `GenericExceptionHandler` is the only
     * consumer of this bean and handles that in its `localizedMessage`.
     */
    @Bean
    fun messageSource(): MessageSource {
        val messageSource = ReloadableResourceBundleMessageSource()
        messageSource.setBasename("classpath:/i18n/messages")
        messageSource.setDefaultEncoding("UTF-8")
        return messageSource
    }
}
