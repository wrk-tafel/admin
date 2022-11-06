package at.wrk.tafel.admin.backend.config.websocket

import java.security.Principal

data class ScannerPrincipal(
    private val id: Int
) : Principal {
    override fun getName(): String {
        return id.toString()
    }
}
