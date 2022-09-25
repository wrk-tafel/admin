package at.wrk.tafel.admin.backend.common.fop

import at.wrk.tafel.admin.backend.common.ExcludeFromTestCoverage
import org.apache.fop.apps.io.ResourceResolverFactory
import org.apache.xmlgraphics.io.Resource
import org.apache.xmlgraphics.io.ResourceResolver
import java.io.ByteArrayOutputStream
import java.io.OutputStream
import java.net.FileNameMap
import java.net.URI
import java.net.URLConnection


@ExcludeFromTestCoverage
// TODO write tests
class ClasspathResolverURIAdapter : ResourceResolver {
    private val delegate: ResourceResolver = ResourceResolverFactory.createDefaultResourceResolver()

    override fun getResource(uri: URI): Resource? {
        return if (uri.scheme.equals("classpath")) {
            val resourcePath = uri.schemeSpecificPart

            val fileNameMap: FileNameMap = URLConnection.getFileNameMap()
            val mimeType = fileNameMap.getContentTypeFor(resourcePath)

            val resourceStream = ClassLoader.getSystemClassLoader().getResourceAsStream(resourcePath)
            resourceStream?.let { Resource(mimeType, resourceStream) }
        } else {
            delegate.getResource(uri)
        }
    }

    override fun getOutputStream(uri: URI): OutputStream? {
        return if (uri.scheme.equals("classpath")) {
            val resourcePath = uri.schemeSpecificPart

            val resourceInputStream = ClassLoader.getSystemClassLoader().getResourceAsStream(resourcePath)
            val byteArrayOutputStream = ByteArrayOutputStream()
            resourceInputStream.transferTo(byteArrayOutputStream)

            return byteArrayOutputStream
        } else {
            delegate.getOutputStream(uri)
        }
    }

}
