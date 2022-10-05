package at.wrk.tafel.admin.backend.common.fop

import org.assertj.core.api.Assertions.assertThat
import org.junit.jupiter.api.Test
import javax.xml.transform.stream.StreamSource

class ClasspathResourceURIResolverTest {

    private val resolver = ClasspathResourceURIResolver()

    @Test
    fun `getResource from classpath`() {
        val source = resolver.resolve("/pdf/test.txt", null)

        assertThat(String((source as StreamSource).inputStream.readAllBytes())).isEqualTo("12345")
    }

    @Test
    fun `getResource from classpath - invalid resource`() {
        val source = resolver.resolve("/pdf/test-invalid.txt", null)

        assertThat(source).isNotNull
    }

}
