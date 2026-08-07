package at.wrk.tafel.admin.backend.modules.version

import at.wrk.tafel.admin.backend.common.ExcludeFromTestCoverage

@ExcludeFromTestCoverage
data class VersionResponse(
    val version: String,
    val buildTime: String,
)
