package at.wrk.tafel.admin.backend.common.auth.model

import org.assertj.core.api.Assertions.assertThat
import org.junit.jupiter.params.ParameterizedTest
import org.junit.jupiter.params.provider.CsvSource

class PasskeyKindTest {

    @ParameterizedTest
    @CsvSource(
        nullValues = ["null"],
        value = [
            "internal, DEVICE",
            "hybrid, DEVICE",
            "'hybrid,internal', DEVICE",
            "usb, SECURITY_KEY",
            "'nfc,usb', SECURITY_KEY",
            "ble, SECURITY_KEY",
            "smart-card, SECURITY_KEY",
            "'internal,usb', DEVICE",
            "null, UNKNOWN",
            "'', UNKNOWN",
            "something-new, UNKNOWN",
        ],
    )
    fun `the kind follows the transports the authenticator reported`(transports: String?, expected: PasskeyKind) {
        assertThat(PasskeyKind.of(transports)).isEqualTo(expected)
    }
}
