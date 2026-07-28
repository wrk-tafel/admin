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
    }

    fun generatePdf(data: Any, stylesheetPath: String): ByteArray {
        val xmlOutStream = ByteArrayOutputStream()
        xmlOutStream.use {
            xmlMapper.writeValue(it, data)
        }
        val xmlBytes = xmlOutStream.toByteArray()

        ByteArrayInputStream(xmlBytes).use { xmlStream ->
            val xmlSource = StreamSource(xmlStream)

            val foUserAgent = fopFactory.newFOUserAgent()
            val outStream = ByteArrayOutputStream()

            outStream.use { out ->
                val fop = fopFactory.newFop(MimeConstants.MIME_PDF, foUserAgent, out)

                val factory = TransformerFactory.newInstance()
                factory.uriResolver = ClasspathResourceURIResolver()

                val transformer = factory.newTransformer(
                    StreamSource(
                        javaClass.getResourceAsStream(stylesheetPath),
                    ),
                )

                val res = SAXResult(fop.defaultHandler)
                transformer.transform(xmlSource, res)
            }

            return outStream.toByteArray()
        }
    }
}
