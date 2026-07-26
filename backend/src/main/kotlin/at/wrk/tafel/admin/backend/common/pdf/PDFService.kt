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

        // "Helvetica" is one of the 14 standard PDF fonts, so by default FOP writes only the font
        // name into the PDF instead of embedding glyphs, and readers/renderers substitute a real
        // font for it - a different one per OS. That made rendering (and any pixel-level rasterization
        // of the PDF, e.g. in tests) OS-dependent. Overriding the "Helvetica" triplet with an embedded,
        // metric-compatible font makes the output byte-for-byte identical regardless of OS.
        private val fopFactory: FopFactory by lazy { buildFopFactory() }

        private fun buildFopFactory(): FopFactory {
            val fontsDirectory = extractBundledFonts()

            fun embedUrl(fileName: String) = File(fontsDirectory, fileName).toURI()

            val fopConfigXml = """
                <fop version="2.0">
                    <renderers>
                        <renderer mime="application/pdf">
                            <fonts>
                                <font kerning="yes" embed-url="${embedUrl("LiberationSans-Regular.ttf")}">
                                    <font-triplet name="Helvetica" style="normal" weight="normal"/>
                                </font>
                                <font kerning="yes" embed-url="${embedUrl("LiberationSans-Bold.ttf")}">
                                    <font-triplet name="Helvetica" style="normal" weight="bold"/>
                                </font>
                                <font kerning="yes" embed-url="${embedUrl("LiberationSans-Italic.ttf")}">
                                    <font-triplet name="Helvetica" style="italic" weight="normal"/>
                                </font>
                                <font kerning="yes" embed-url="${embedUrl("LiberationSans-BoldItalic.ttf")}">
                                    <font-triplet name="Helvetica" style="italic" weight="bold"/>
                                </font>
                            </fonts>
                        </renderer>
                    </renderers>
                </fop>
            """.trimIndent()

            val confParser = ByteArrayInputStream(fopConfigXml.toByteArray()).use {
                FopConfParser(it, File(".").toURI())
            }
            return confParser.fopFactoryBuilder.build()
        }

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
                        javaClass.getResourceAsStream(stylesheetPath)
                    )
                )

                val res = SAXResult(fop.defaultHandler)
                transformer.transform(xmlSource, res)
            }

            return outStream.toByteArray()
        }
    }

}
