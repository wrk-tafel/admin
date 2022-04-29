package at.wrk.tafel.admin.backend.modules.customer.masterdata

import io.mockk.junit5.MockKExtension
import org.junit.jupiter.api.BeforeEach
import org.junit.jupiter.api.Test
import org.junit.jupiter.api.extension.ExtendWith
import org.junit.jupiter.api.fail

@ExtendWith(MockKExtension::class)
class MasterdataPdfServiceImplTest {

    private lateinit var masterdataPdfServiceImpl: MasterdataPdfServiceImpl

    @BeforeEach
    fun beforeEach() {
        masterdataPdfServiceImpl = MasterdataPdfServiceImpl()
    }

    @Test
    fun test() {
        fail("IMPL")
    }

}
