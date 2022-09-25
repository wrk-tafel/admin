package at.wrk.tafel.admin.backend.common.fop

import org.assertj.core.api.Assertions.assertThat
import org.junit.jupiter.api.Test
import java.net.URI


class ClasspathResolverURIAdapterTest {

    private val adapter = ClasspathResolverURIAdapter()

    @Test
    fun `getResource from absolute classpath`() {
        val resource = adapter.getResource(URI.create("classpath:/fop/test.txt"))

        assertThat("12345").isEqualTo(resource?.readAllBytes().toString())
    }

}
