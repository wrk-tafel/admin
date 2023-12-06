package at.wrk.tafel.admin.backend.modules.checkin.internal

import org.assertj.core.api.Assertions.assertThat
import org.junit.jupiter.api.BeforeEach
import org.junit.jupiter.api.Test

internal class ScannerServiceTest {

    private lateinit var service: ScannerService

    @BeforeEach
    fun beforeEach() {
        service = ScannerService()
    }

    @Test
    fun `register new scanner`() {
        val id = service.registerScanner("USER")
        assertThat(id).isEqualTo(1)
    }

    @Test
    fun `register same scanner again and id stays the same`() {
        val firstId = service.registerScanner("USER")
        assertThat(firstId).isEqualTo(1)

        val secondId = service.registerScanner("USER")
        assertThat(secondId).isEqualTo(1)
    }

    @Test
    fun `register multiple scanner with different users`() {
        val firstId = service.registerScanner("USER1")
        assertThat(firstId).isEqualTo(1)

        val secondId = service.registerScanner("USER2")
        assertThat(secondId).isEqualTo(2)
    }

    @Test
    fun `get scanner ids`() {
        val firstId = service.registerScanner("USER1")
        val secondId = service.registerScanner("USER2")

        assertThat(service.getScannerIds()).containsExactly(firstId, secondId)
    }

}
