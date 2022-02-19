package at.wrk.tafel.admin.backend.common.rest

import org.springframework.core.annotation.AliasFor
import org.springframework.web.bind.annotation.RequestMapping
import org.springframework.web.bind.annotation.RestController

@Target(AnnotationTarget.CLASS)
@Retention(AnnotationRetention.RUNTIME)
@RestController
@RequestMapping("/api")
annotation class TafelRestController(
    @get:AliasFor(annotation = RestController::class)
    val value: String = ""
)
