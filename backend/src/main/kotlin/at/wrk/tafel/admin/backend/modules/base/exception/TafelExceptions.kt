package at.wrk.tafel.admin.backend.modules.base.exception

import at.wrk.tafel.admin.backend.common.ExcludeFromTestCoverage
import org.springframework.http.HttpStatus

@ExcludeFromTestCoverage
class TafelException(
    override val message: String?,
    override val cause: Throwable? = null,
    val status: HttpStatus? = null
) : RuntimeException()

@ExcludeFromTestCoverage
class TafelValidationException(
    override val message: String?,
    override val cause: Throwable? = null,
    val status: HttpStatus? = null
) : RuntimeException()
