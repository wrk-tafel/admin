package at.wrk.tafel.admin.backend.common.pdf

import org.apache.fop.apps.FopConfParser
import org.apache.fop.apps.FopFactory
import org.apache.fop.apps.MimeConstants
import org.apache.fop.events.Event
import org.apache.fop.events.EventFormatter
import org.apache.fop.events.EventListener
import org.apache.fop.events.model.EventSeverity
import org.slf4j.LoggerFactory
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
        private val log = LoggerFactory.getLogger(PDFService::class.java)

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
        internal fun compiledStylesheet(stylesheetPath: String): Templates = compiledStylesheets.computeIfAbsent(stylesheetPath) { path ->
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

    /**
     * Renders [data] through the stylesheet at [stylesheetPath] and logs one INFO line per document.
     * [subject] names what the document is about (e.g. `household 4101`) and is added to that line
     * and to every FOP warning, so a layout warning can be traced to the document and record it came
     * from. It must be an identifier only - no names or addresses (GDPR).
     */
    fun generatePdf(data: Any, stylesheetPath: String, subject: String? = null): ByteArray {
        val label = documentLabel(stylesheetPath, subject)
        val startedAt = System.nanoTime()

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
                    val userAgent = fopFactory.newFOUserAgent()
                    // With a listener registered FOP does not install its own logging one, whose
                    // messages carry no hint of which document they belong to.
                    userAgent.eventBroadcaster.addEventListener(LabelledLoggingEventListener(label))
                    fopFactory.newFop(MimeConstants.MIME_PDF, userAgent, out)
                }

                val transformer = compiledStylesheet(stylesheetPath).newTransformer()

                val res = SAXResult(fop.defaultHandler)
                transformer.transform(xmlSource, res)
            }

            val pdfBytes = outStream.toByteArray()
            log.info(
                "Generated PDF {} in {} ms ({} bytes)",
                label,
                (System.nanoTime() - startedAt) / 1_000_000,
                pdfBytes.size,
            )
            return pdfBytes
        }
    }

    private fun documentLabel(stylesheetPath: String, subject: String?): String {
        val template = stylesheetPath.substringAfterLast('/')
        return if (subject.isNullOrBlank()) template else "$template ($subject)"
    }

    /**
     * Sends FOP's events to the application log, each prefixed with the document being rendered.
     * FOP's own logging listener writes them unattributed, and one is created per document because
     * the [label] differs.
     */
    internal class LabelledLoggingEventListener(private val label: String) : EventListener {
        override fun processEvent(event: Event) {
            val message = "PDF $label: ${EventFormatter.format(event)}"
            when (event.severity) {
                EventSeverity.INFO -> log.debug(message)
                EventSeverity.WARN -> log.warn(message)
                EventSeverity.ERROR -> log.error(message, event.getParam("e") as? Throwable)
                // A fatal event is followed by the exception that aborts the rendering, which the
                // caller reports.
                else -> Unit
            }
        }
    }
}
