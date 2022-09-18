package at.wrk.tafel.admin.backend.modules.customer.masterdata

import io.mockk.junit5.MockKExtension
import org.junit.jupiter.api.BeforeEach
import org.junit.jupiter.api.Test
import org.junit.jupiter.api.extension.ExtendWith

@ExtendWith(MockKExtension::class)
class CustomerPdfServiceImplTest {

    private lateinit var customerPdfServiceImpl: CustomerPdfServiceImpl

    @BeforeEach
    fun beforeEach() {
        customerPdfServiceImpl = CustomerPdfServiceImpl()
    }

    @Test
    fun test() {
        // fail("IMPL")
        // TODO implement test
    }

}
