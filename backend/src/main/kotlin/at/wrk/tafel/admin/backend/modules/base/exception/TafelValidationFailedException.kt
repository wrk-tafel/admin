package at.wrk.tafel.admin.backend.modules.base.exception

import at.wrk.tafel.admin.backend.common.ExcludeFromTestCoverage

@ExcludeFromTestCoverage
class TafelValidationFailedException(override val message: String?) : RuntimeException()
