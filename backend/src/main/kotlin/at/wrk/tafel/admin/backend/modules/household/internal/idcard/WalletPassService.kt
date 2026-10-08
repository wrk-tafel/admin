package at.wrk.tafel.admin.backend.modules.household.internal.idcard

import at.wrk.tafel.admin.backend.config.properties.TafelAdminProperties
import at.wrk.tafel.admin.backend.config.properties.TafelAdminWalletProperties
import at.wrk.tafel.admin.backend.modules.household.internal.masterdata.IdCardSummary
import org.bouncycastle.cert.jcajce.JcaCertStore
import org.bouncycastle.cms.CMSProcessableByteArray
import org.bouncycastle.cms.CMSSignedDataGenerator
import org.bouncycastle.cms.jcajce.JcaSignerInfoGeneratorBuilder
import org.bouncycastle.operator.jcajce.JcaContentSignerBuilder
import org.bouncycastle.operator.jcajce.JcaDigestCalculatorProviderBuilder
import org.springframework.stereotype.Service
import tools.jackson.databind.json.JsonMapper
import java.awt.RenderingHints
import java.awt.image.BufferedImage
import java.io.ByteArrayOutputStream
import java.nio.file.Files
import java.nio.file.Path
import java.security.KeyStore
import java.security.MessageDigest
import java.security.PrivateKey
import java.security.cert.CertificateFactory
import java.security.cert.X509Certificate
import java.util.zip.ZipEntry
import java.util.zip.ZipOutputStream
import javax.imageio.ImageIO

/**
 * Builds the ID card as a wallet pass - a `.pkpass` file, the format Apple Wallet defines and
 * Google Wallet imports as well. A pass is a ZIP of `pass.json`, its images, a `manifest.json`
 * listing the SHA-1 of each of those, and a detached PKCS #7 signature over that manifest made with
 * a Pass Type ID certificate. The signature is what a phone checks before it offers to add the
 * pass, which is why the feature exists only where a deployment configures one (see
 * `TafelAdminProperties.walletPassAvailable`).
 *
 * The pass carries what the check-in needs and nothing else: the household number as a QR code -
 * the same content the printed card's QR code has, so the scanner cannot tell them apart - the main
 * person's name and the person counts. It has no expiry date, like the printed card: a renewal does
 * not reissue either of them, and whether a household is currently eligible is answered at
 * check-in, not by the card.
 *
 * The certificate and key are read from disk for every pass. That is two small files per download,
 * and it is what lets an operator swap a renewed certificate in without a restart.
 */
@Service
class WalletPassService(
    private val tafelAdminProperties: TafelAdminProperties,
) {

    companion object {
        const val CONTENT_TYPE = "application/vnd.apple.pkpass"

        private const val LOGO_RESOURCE_PATH = "/assets/logo.png"
        private val jsonMapper = JsonMapper.builder().build()
    }

    fun generatePass(summary: IdCardSummary): ByteArray {
        val properties = tafelAdminProperties.wallet
        check(tafelAdminProperties.walletPassAvailable && properties != null) {
            "Wallet passes are not configured (tafeladmin.wallet / tafeladmin.features.walletPassEnabled)"
        }

        val logo = WalletPassService::class.java.getResourceAsStream(LOGO_RESOURCE_PATH)!!.use { ImageIO.read(it) }
        val files = linkedMapOf(
            "pass.json" to jsonMapper.writeValueAsBytes(passDefinition(summary, properties)),
            "icon.png" to fitInto(logo, 29, 29),
            "icon@2x.png" to fitInto(logo, 58, 58),
            "icon@3x.png" to fitInto(logo, 87, 87),
            "logo.png" to fitInto(logo, 160, 50),
            "logo@2x.png" to fitInto(logo, 320, 100),
        )

        val manifest = jsonMapper.writeValueAsBytes(files.mapValues { (_, content) -> sha1Hex(content) })
        files["manifest.json"] = manifest
        files["signature"] = sign(manifest, properties)

        return zip(files)
    }

    private fun passDefinition(summary: IdCardSummary, properties: TafelAdminWalletProperties): Map<String, Any> {
        val householdId = summary.householdId.toString()
        return mapOf(
            "formatVersion" to 1,
            "passTypeIdentifier" to properties.passTypeIdentifier!!,
            "teamIdentifier" to properties.teamIdentifier!!,
            // One pass per household: adding it again replaces the one already in the wallet.
            "serialNumber" to "household-$householdId",
            "organizationName" to properties.organizationName,
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
                    field("issuer", "Ausgestellt von", "Wiener Rotes Kreuz – Team Österreich Tafel, Safargasse 4, 1030 Wien"),
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

    private fun sha1Hex(content: ByteArray): String = MessageDigest.getInstance("SHA-1").digest(content).joinToString("") { "%02x".format(it) }

    private fun sign(manifest: ByteArray, properties: TafelAdminWalletProperties): ByteArray {
        val password = properties.certificatePassword!!.toCharArray()
        val keyStore = KeyStore.getInstance("PKCS12")
        Files.newInputStream(Path.of(properties.certificatePath!!)).use { keyStore.load(it, password) }

        val alias = keyStore.aliases().asSequence().firstOrNull { keyStore.isKeyEntry(it) }
            ?: error("No private key in the wallet pass certificate file ${properties.certificatePath}")
        val privateKey = keyStore.getKey(alias, password) as PrivateKey
        val certificate = keyStore.getCertificate(alias) as X509Certificate
        // An expired certificate still signs, and the phone then refuses the pass without saying
        // why - failing here puts the reason in the log instead.
        certificate.checkValidity()

        val intermediateCertificate = Files.newInputStream(Path.of(properties.wwdrCertificatePath!!)).use {
            CertificateFactory.getInstance("X.509").generateCertificate(it) as X509Certificate
        }

        val signatureAlgorithm = if (privateKey.algorithm == "EC") "SHA256withECDSA" else "SHA256withRSA"
        val generator = CMSSignedDataGenerator().apply {
            addSignerInfoGenerator(
                JcaSignerInfoGeneratorBuilder(JcaDigestCalculatorProviderBuilder().build())
                    .build(JcaContentSignerBuilder(signatureAlgorithm).build(privateKey), certificate),
            )
            addCertificates(JcaCertStore(listOf(certificate, intermediateCertificate)))
        }

        // Detached: the signature file holds no copy of the manifest it signs.
        return generator.generate(CMSProcessableByteArray(manifest), false).encoded
    }

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
