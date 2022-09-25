package at.wrk.tafel.admin.backend.common.fop

import io.mockk.impl.annotations.RelaxedMockK
import io.mockk.junit5.MockKExtension
import io.mockk.verify
import org.apache.xmlgraphics.io.ResourceResolver
import org.assertj.core.api.Assertions.assertThat
import org.junit.jupiter.api.BeforeEach
import org.junit.jupiter.api.Test
import org.junit.jupiter.api.extension.ExtendWith
import java.net.URI

@ExtendWith(MockKExtension::class)
class ClasspathResolverURIAdapterTest {

    @RelaxedMockK
    private lateinit var delegateMock: ResourceResolver

    private lateinit var adapter: ClasspathResolverURIAdapter

    @BeforeEach
    fun beforeEach() {
        adapter = ClasspathResolverURIAdapter()
        adapter.delegate = delegateMock
    }

    @Test
    fun `getResource from classpath`() {
        val resource = adapter.getResource(URI.create("classpath:/fop/test.txt"))

        assertThat(String(resource!!.readAllBytes()!!)).isEqualTo("12345")
        verify(exactly = 0) { delegateMock.getResource(any()) }
    }

    @Test
    fun `getResource from classpath - invalid resource`() {
        val resource = adapter.getResource(URI.create("classpath:/fop/test-invalid.txt"))

        assertThat(resource).isNull()
        verify(exactly = 0) { delegateMock.getResource(any()) }
    }

    @Test
    fun `getResource from non classpath location`() {
        val uri = URI.create("file:/fop/test.txt")
        val resource = adapter.getResource(uri)

        assertThat(resource).isNotNull
        verify(exactly = 1) { delegateMock.getResource(uri) }
    }

}
