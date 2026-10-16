package at.wrk.tafel.admin.backend.common.auth.components

import org.assertj.core.api.Assertions.assertThat
import org.junit.jupiter.api.Test
import org.springframework.mock.web.MockHttpServletRequest

class PasskeyRelyingPartyTest {

    @Test
    fun `the site is the host the request came in on, without the default port`() {
        val relyingParty = PasskeyRelyingParty.of(request("https", "tafel.wrk.at", 443))

        assertThat(relyingParty).isEqualTo(PasskeyRelyingParty(id = "tafel.wrk.at", origin = "https://tafel.wrk.at"))
    }

    @Test
    fun `a port that is not the scheme's default is part of the origin but not of the id`() {
        assertThat(PasskeyRelyingParty.of(request("http", "localhost", 4200)))
            .isEqualTo(PasskeyRelyingParty(id = "localhost", origin = "http://localhost:4200"))
        assertThat(PasskeyRelyingParty.of(request("https", "tafel.wrk.at", 80)).origin).isEqualTo("https://tafel.wrk.at:80")
        assertThat(PasskeyRelyingParty.of(request("http", "localhost", 80)).origin).isEqualTo("http://localhost")
    }

    private fun request(scheme: String, serverName: String, serverPort: Int) = MockHttpServletRequest().apply {
        this.scheme = scheme
        this.serverName = serverName
        this.serverPort = serverPort
    }
}
