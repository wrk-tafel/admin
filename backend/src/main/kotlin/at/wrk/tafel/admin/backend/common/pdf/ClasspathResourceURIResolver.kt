package at.wrk.tafel.admin.backend.common.pdf

import javax.xml.transform.Source
import javax.xml.transform.URIResolver
import javax.xml.transform.stream.StreamSource

class ClasspathResourceURIResolver : URIResolver {

    override fun resolve(href: String?, base: String?): Source {
        return StreamSource(javaClass.getResourceAsStream(href))
    }

}
