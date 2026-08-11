package at.wrk.tafel.admin.backend.common.pdf

import org.apache.fop.apps.FopConfParser
import org.apache.fop.apps.FopFactory
import org.apache.fop.apps.MimeConstants
import org.springframework.stereotype.Service
import tools.jackson.dataformat.xml.XmlMapper
import java.io.ByteArrayInputStream
import java.io.ByteArrayOutputStream
import java.io.File
import java.nio.file.Files
import java.util.concurrent.ConcurrentHashMap
import javax.xml.transform.Templates
import javax.xml.transform.TransformerFactory
import javax.xml.transform.sax.SAXResult
import javax.xml.transform.stream.StreamSource

@Service
class PDFService {

    companion object {
        private val xmlMapper = XmlMapper()

        private val fopFactory: FopFactory by lazy { buildFopFactory() }

        private fun buildFopFactory(): FopFactory {
            val fontsDirectory = extractBundledFonts()

            val confParser = PDFService::class.java.getResourceAsStream("/fop/fop-config.xml")!!.use {
                FopConfParser(it, fontsDirectory.toURI())
            }
            return confParser.fopFactoryBuilder.build()
        }

        /**
         * Apache FOP needs real filesystem paths for font registration, not classpath streams, so
         * the bundled Liberation Sans fonts are copied out to a temp directory at factory-build
         * time (once, since [fopFactory] is lazy) purely to satisfy that requirement.
         */
        private fun extractBundledFonts(): File {
            val targetDirectory = Files.createTempDirectory("tafel-pdf-fonts").toFile()
            targetDirectory.deleteOnExit()

            listOf(
                "LiberationSans-Regular.ttf",
                "LiberationSans-Bold.ttf",
                "LiberationSans-Italic.ttf",
                "LiberationSans-BoldItalic.ttf",
            ).forEach { fileName ->
                val targetFile = File(targetDirectory, fileName)
                PDFService::class.java.getResourceAsStream("/fonts/liberation-sans/$fileName")!!.use { input ->
                    targetFile.outputStream().use { output -> input.copyTo(output) }
                }
                targetFile.deleteOnExit()
            }

            return targetDirectory
        }

        /**
         * A [TransformerFactory] is not thread-safe, and compiling a stylesheet is the only thing
         * this one is ever used for, so [compiledStylesheets] does that under a lock on it. Its
         * [ClasspathResourceURIResolver] is what pulls an `xsl:include` out of the classpath while
         * compiling.
         */
        private val transformerFactory: TransformerFactory by lazy {
            TransformerFactory.newInstance().apply { uriResolver = ClasspathResourceURIResolver() }
        }

        private val compiledStylesheets = ConcurrentHashMap<String, Templates>()

        /**
         * Compiling a stylesheet parses its whole `xsl:include` tree, so each one is compiled once
         * and kept: they are classpath resources and cannot change while the application runs.
         * [Templates] is thread-safe and reusable - a [javax.xml.transform.Transformer] is not,
         * which is why [generatePdf] creates a fresh one per call instead of sharing one.
         */
        internal fun compiledStylesheet(stylesheetPath: String): Templates =
            compiledStylesheets.computeIfAbsent(stylesheetPath) { path ->
                val stylesheet = checkNotNull(PDFService::class.java.getResourceAsStream(path)) {
                    "PDF stylesheet not found: $path"
                }
                stylesheet.use {
                    synchronized(transformerFactory) {
                        transformerFactory.newTemplates(StreamSource(it))
                    }
                }
            }
    }

    fun generatePdf(data: Any, stylesheetPath: String): ByteArray {
        val xmlOutStream = ByteArrayOutputStream()
        xmlOutStream.use {
            xmlMapper.writeValue(it, data)
        }
        val xmlBytes = xmlOutStream.toByteArray()

        ByteArrayInputStream(xmlBytes).use { xmlStream ->
            val xmlSource = StreamSource(xmlStream)

            val outStream = ByteArrayOutputStream()

            outStream.use { out ->
                // Building the Fop reads the shared FOP configuration, which is a DOM tree that
                // caches its own traversal state, so two threads doing it at once corrupt each
                // other. Only the construction is serialized - the rendering below, which is where
                // the time goes, stays concurrent.
                val fop = synchronized(fopFactory) {
                    fopFactory.newFop(MimeConstants.MIME_PDF, fopFactory.newFOUserAgent(), out)
                }

                val transformer = compiledStylesheet(stylesheetPath).newTransformer()

                val res = SAXResult(fop.defaultHandler)
                transformer.transform(xmlSource, res)
            }

            return outStream.toByteArray()
        }
    }
}
