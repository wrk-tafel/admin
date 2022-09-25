package at.wrk.tafel.admin.backend.common.fop

import org.apache.fop.apps.io.ResourceResolverFactory
import org.apache.xmlgraphics.io.Resource
import org.apache.xmlgraphics.io.ResourceResolver
import java.io.OutputStream
import java.net.FileNameMap
import java.net.URI
import java.net.URLConnection

class ClasspathResolverURIAdapter : ResourceResolver {
    var delegate: ResourceResolver = ResourceResolverFactory.createDefaultResourceResolver()

    override fun getResource(uri: URI): Resource? {
        return if ("classpath" == uri.scheme) {
            val resourcePath = uri.schemeSpecificPart

            val fileNameMap: FileNameMap = URLConnection.getFileNameMap()
            val mimeType = fileNameMap.getContentTypeFor(resourcePath)

            val resourceStream = javaClass.getResourceAsStream(resourcePath)
            resourceStream?.let { Resource(mimeType, resourceStream) }
        } else {
            delegate.getResource(uri)
        }
    }

    override fun getOutputStream(uri: URI): OutputStream? {
        return delegate.getOutputStream(uri)
    }

}
