package at.wrk.tafel.admin.backend.modules.household.internal.idcard

import at.wrk.tafel.admin.backend.modules.household.internal.masterdata.IdCardSummary
import org.springframework.stereotype.Service
import tools.jackson.databind.json.JsonMapper
import java.awt.RenderingHints
import java.awt.image.BufferedImage
import java.io.ByteArrayOutputStream
import java.security.MessageDigest
import java.util.zip.ZipEntry
import java.util.zip.ZipOutputStream
import javax.imageio.ImageIO

/**
 * Builds the ID card as a wallet file - a `.pkpass`: a ZIP of `pass.json`, its images and a
 * `manifest.json` listing the SHA-1 of each of those.
 *
 * **The file is deliberately unsigned.** The format is Apple's, and the signature it provides for
 * can only be made with a Pass Type ID certificate from Apple's paid developer program, which this
 * project does not use. Wallet apps on Android read the file without one; an iPhone refuses it, so
 * the card is offered as an Android format and iPhone users get the image or the PDF. See ADR-0066.
 *
 * The pass carries what the check-in needs and nothing else: the household number as a QR code -
 * the same content the printed card's QR code has, so the scanner cannot tell them apart - the main
 * person's name and the person counts. It has no expiry date, like the printed card: a renewal does
 * not reissue either of them, and whether a household is currently eligible is answered at
 * check-in, not by the card.
 */
@Service
class WalletPassService {

    companion object {
        const val CONTENT_TYPE = "application/vnd.apple.pkpass"

        // Both are mandatory fields of pass.json. They would name the certificate a signed pass was
        // issued under; on an unsigned one they only have to be present and stable.
        private const val PASS_TYPE_IDENTIFIER = "pass.at.wrk.tafel.bezugskarte"
        private const val TEAM_IDENTIFIER = "TAFELADMIN"

        private const val ORGANIZATION_NAME = "Wiener Rotes Kreuz – Team Österreich Tafel"
        private const val LOGO_RESOURCE_PATH = "/assets/logo.png"
        private val jsonMapper = JsonMapper.builder().build()
    }

    fun generatePass(summary: IdCardSummary): ByteArray {
        val logo = WalletPassService::class.java.getResourceAsStream(LOGO_RESOURCE_PATH)!!.use { ImageIO.read(it) }
        val files = linkedMapOf(
            "pass.json" to jsonMapper.writeValueAsBytes(passDefinition(summary)),
            "icon.png" to fitInto(logo, 29, 29),
            "icon@2x.png" to fitInto(logo, 58, 58),
            "icon@3x.png" to fitInto(logo, 87, 87),
            "logo.png" to fitInto(logo, 160, 50),
            "logo@2x.png" to fitInto(logo, 320, 100),
        )
        files["manifest.json"] = jsonMapper.writeValueAsBytes(files.mapValues { (_, content) -> sha1Hex(content) })

        return zip(files)
    }

    private fun passDefinition(summary: IdCardSummary): Map<String, Any> {
        val householdId = summary.householdId.toString()
        return mapOf(
            "formatVersion" to 1,
            "passTypeIdentifier" to PASS_TYPE_IDENTIFIER,
            "teamIdentifier" to TEAM_IDENTIFIER,
            // One pass per household: adding it again replaces the one already in the wallet.
            "serialNumber" to "household-$householdId",
            "organizationName" to ORGANIZATION_NAME,
            "description" to "Bezugskarte Team Österreich Tafel",
            "logoText" to "Bezugskarte",
            "backgroundColor" to "rgb(255, 255, 255)",
            "foregroundColor" to "rgb(26, 26, 26)",
            "labelColor" to "rgb(200, 16, 46)",
            "barcodes" to listOf(
                mapOf(
                    "format" to "PKBarcodeFormatQR",
                    "message" to householdId,
                    "messageEncoding" to "iso-8859-1",
                    "altText" to householdId,
                ),
            ),
            "generic" to mapOf(
                "primaryFields" to listOf(
                    field("name", "Hauptbezieher", summary.fullName),
                ),
                "secondaryFields" to listOf(
                    field("householdId", "Kundennummer", householdId),
                    field("countPersons", "Personen im Haushalt", summary.countPersons),
                ),
                "auxiliaryFields" to listOf(
                    field("countInfants", "davon unter 3 Jahren", summary.countInfants),
                ),
                "backFields" to listOf(
                    field(
                        "notice",
                        "Hinweis",
                        "Diese Bezugskarte ist Eigentum des Roten Kreuzes und ist auf Verlangen wieder zurückzugeben.",
                    ),
                    field("issuer", "Ausgestellt von", "$ORGANIZATION_NAME, Safargasse 4, 1030 Wien"),
                ),
            ),
        )
    }

    private fun field(key: String, label: String, value: Any): Map<String, Any> = mapOf("key" to key, "label" to label, "value" to value)

    /** Scales the logo to fit a [width] x [height] box, centered on a transparent canvas of exactly that size. */
    private fun fitInto(source: BufferedImage, width: Int, height: Int): ByteArray {
        val scale = minOf(width.toDouble() / source.width, height.toDouble() / source.height)
        val scaledWidth = (source.width * scale).toInt().coerceAtLeast(1)
        val scaledHeight = (source.height * scale).toInt().coerceAtLeast(1)

        val canvas = BufferedImage(width, height, BufferedImage.TYPE_INT_ARGB)
        val graphics = canvas.createGraphics()
        try {
            graphics.setRenderingHint(RenderingHints.KEY_INTERPOLATION, RenderingHints.VALUE_INTERPOLATION_BICUBIC)
            graphics.setRenderingHint(RenderingHints.KEY_RENDERING, RenderingHints.VALUE_RENDER_QUALITY)
            graphics.drawImage(source, (width - scaledWidth) / 2, (height - scaledHeight) / 2, scaledWidth, scaledHeight, null)
        } finally {
            graphics.dispose()
        }

        return ByteArrayOutputStream().use {
            ImageIO.write(canvas, "png", it)
            it.toByteArray()
        }
    }

    /**
     * SHA-1 is not a choice made here: the pass format defines `manifest.json` as the SHA-1 of each
     * file, and a wallet app expects exactly that. Nothing is protected by it - it is a checksum of
     * files that travel in the same archive.
     */
    private fun sha1Hex(content: ByteArray): String = MessageDigest.getInstance("SHA-1") // NOSONAR - kotlin:S4790, mandated by the pass format
        .digest(content)
        .joinToString("") { "%02x".format(it) }

    private fun zip(files: Map<String, ByteArray>): ByteArray = ByteArrayOutputStream().use { out ->
        ZipOutputStream(out).use { zip ->
            files.forEach { (name, content) ->
                zip.putNextEntry(ZipEntry(name))
                zip.write(content)
                zip.closeEntry()
            }
        }
        out.toByteArray()
    }
}
