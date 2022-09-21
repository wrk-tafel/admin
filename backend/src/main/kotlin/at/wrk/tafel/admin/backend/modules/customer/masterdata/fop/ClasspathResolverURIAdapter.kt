package at.wrk.tafel.admin.backend.modules.customer.masterdata.fop

import org.apache.fop.apps.io.ResourceResolverFactory
import org.apache.xmlgraphics.io.Resource
import org.apache.xmlgraphics.io.ResourceResolver
import java.io.OutputStream
import java.net.URI
import java.net.URL

class ClasspathResolverURIAdapter : ResourceResolver {
    private val wrapped: ResourceResolver = ResourceResolverFactory.createDefaultResourceResolver()

    override fun getResource(uri: URI): Resource {
        return if (uri.scheme.equals("classpath")) {
            val url: URL = javaClass.classLoader.getResource(uri.getSchemeSpecificPart())
            Resource(url.openStream())
        } else {
            wrapped.getResource(uri)
        }
    }

    override fun getOutputStream(uri: URI?): OutputStream {
        return wrapped.getOutputStream(uri)
    }

}
