package at.wrk.tafel.admin.backend.modules.household.internal.idcard

import at.wrk.tafel.admin.backend.config.properties.TafelAdminProperties
import at.wrk.tafel.admin.backend.config.properties.TafelAdminWalletProperties
import at.wrk.tafel.admin.backend.modules.household.internal.masterdata.IdCardSummary
import org.assertj.core.api.Assertions.assertThat
import org.assertj.core.api.Assertions.assertThatThrownBy
import org.bouncycastle.asn1.x500.X500Name
import org.bouncycastle.cert.jcajce.JcaX509CertificateConverter
import org.bouncycastle.cert.jcajce.JcaX509CertificateHolder
import org.bouncycastle.cert.jcajce.JcaX509v3CertificateBuilder
import org.bouncycastle.cms.CMSProcessableByteArray
import org.bouncycastle.cms.CMSSignedData
import org.bouncycastle.cms.jcajce.JcaSimpleSignerInfoVerifierBuilder
import org.bouncycastle.operator.jcajce.JcaContentSignerBuilder
import org.junit.jupiter.api.BeforeEach
import org.junit.jupiter.api.Test
import org.junit.jupiter.api.io.TempDir
import tools.jackson.databind.json.JsonMapper
import java.io.ByteArrayInputStream
import java.math.BigInteger
import java.nio.file.Files
import java.nio.file.Path
import java.security.KeyPair
import java.security.KeyPairGenerator
import java.security.KeyStore
import java.security.MessageDigest
import java.security.cert.CertificateExpiredException
import java.security.cert.X509Certificate
import java.time.Instant
import java.time.temporal.ChronoUnit
import java.util.Date
import java.util.zip.ZipInputStream
import javax.imageio.ImageIO

/**
 * Signs with a throwaway certificate chain generated per run - a real Pass Type ID certificate is
 * key material and cannot live in the repository. What a phone verifies beyond this is that the
 * chain ends at Apple, which no test here can stand in for.
 */
class WalletPassServiceTest {

    @TempDir
    private lateinit var tempDir: Path

    private val password = "test-password"
    private val properties = TafelAdminProperties()
    private val summary = IdCardSummary(householdId = 4101, fullName = "Max Mustermann", countPersons = 3, countInfants = 1)

    private lateinit var signingCertificate: X509Certificate
    private lateinit var intermediateCertificate: X509Certificate
    private lateinit var service: WalletPassService

    @BeforeEach
    fun beforeEach() {
        configureWallet(validUntil = Instant.now().plus(30, ChronoUnit.DAYS))
        service = WalletPassService(properties)
    }

    @Test
    fun `pass holds the household number as its qr code and the counts printed on the card`() {
        val files = unzip(service.generatePass(summary))

        assertThat(files.keys).containsExactly(
            "pass.json",
            "icon.png",
            "icon@2x.png",
            "icon@3x.png",
            "logo.png",
            "logo@2x.png",
            "manifest.json",
            "signature",
        )

        val pass = JsonMapper.builder().build().readTree(files.getValue("pass.json"))
        assertThat(pass["formatVersion"].asInt()).isEqualTo(1)
        assertThat(pass["passTypeIdentifier"].asString()).isEqualTo("pass.at.example.tafel")
        assertThat(pass["teamIdentifier"].asString()).isEqualTo("ABCDE12345")
        assertThat(pass["serialNumber"].asString()).isEqualTo("household-4101")
        assertThat(pass["organizationName"].asString()).isEqualTo("Wiener Rotes Kreuz – Team Österreich Tafel")

        // the scanner reads the same content off a wallet pass as off the printed card
        val barcode = pass["barcodes"][0]
        assertThat(barcode["format"].asString()).isEqualTo("PKBarcodeFormatQR")
        assertThat(barcode["message"].asString()).isEqualTo("4101")

        val generic = pass["generic"]
        assertThat(generic["primaryFields"][0]["value"].asString()).isEqualTo("Max Mustermann")
        assertThat(generic["secondaryFields"][1]["value"].asInt()).isEqualTo(3)
        assertThat(generic["auxiliaryFields"][0]["value"].asInt()).isEqualTo(1)
    }

    @Test
    fun `manifest lists the sha1 of every file except itself and the signature`() {
        val files = unzip(service.generatePass(summary))

        val manifest = JsonMapper.builder().build().readTree(files.getValue("manifest.json"))
        val hashedFiles = files.keys - setOf("manifest.json", "signature")

        assertThat(manifest.propertyNames()).containsExactlyInAnyOrderElementsOf(hashedFiles)
        hashedFiles.forEach { name ->
            val expected = MessageDigest.getInstance("SHA-1").digest(files.getValue(name)).joinToString("") { "%02x".format(it) }
            assertThat(manifest[name].asString()).describedAs(name).isEqualTo(expected)
        }
    }

    @Test
    fun `signature is a detached signature over the manifest that carries the intermediate certificate`() {
        val files = unzip(service.generatePass(summary))
        val verifier = JcaSimpleSignerInfoVerifierBuilder().build(signingCertificate)

        val signedData = CMSSignedData(CMSProcessableByteArray(files.getValue("manifest.json")), files.getValue("signature"))
        assertThat(signedData.signerInfos.signers.single().verify(verifier)).isTrue()

        val embedded = signedData.certificates.getMatches(null).map { it.subject.toString() }
        assertThat(embedded).containsExactlyInAnyOrder(
            JcaX509CertificateHolder(signingCertificate).subject.toString(),
            JcaX509CertificateHolder(intermediateCertificate).subject.toString(),
        )

        // detached - verifying against anything but the manifest fails
        val tampered = CMSSignedData(CMSProcessableByteArray("{}".toByteArray()), files.getValue("signature"))
        assertThatThrownBy { tampered.signerInfos.signers.single().verify(verifier) }.isInstanceOf(Exception::class.java)
    }

    @Test
    fun `images are scaled to the sizes a pass expects`() {
        val files = unzip(service.generatePass(summary))

        fun size(name: String) = ImageIO.read(ByteArrayInputStream(files.getValue(name))).let { it.width to it.height }
        assertThat(size("icon.png")).isEqualTo(29 to 29)
        assertThat(size("icon@2x.png")).isEqualTo(58 to 58)
        assertThat(size("icon@3x.png")).isEqualTo(87 to 87)
        assertThat(size("logo.png")).isEqualTo(160 to 50)
        assertThat(size("logo@2x.png")).isEqualTo(320 to 100)
    }

    @Test
    fun `an expired certificate is refused instead of producing a pass no phone accepts`() {
        configureWallet(validUntil = Instant.now().minus(1, ChronoUnit.DAYS))

        assertThatThrownBy { service.generatePass(summary) }.isInstanceOf(CertificateExpiredException::class.java)
    }

    @Test
    fun `no pass is generated while the feature is switched off or not configured`() {
        properties.features.walletPassEnabled = false
        assertThatThrownBy { service.generatePass(summary) }.isInstanceOf(IllegalStateException::class.java)

        properties.features.walletPassEnabled = true
        properties.wallet = null
        assertThatThrownBy { service.generatePass(summary) }.isInstanceOf(IllegalStateException::class.java)
    }

    private fun configureWallet(validUntil: Instant) {
        val intermediateKeys = generateKeyPair()
        intermediateCertificate = certificate("CN=Test WWDR", intermediateKeys, "CN=Test WWDR", intermediateKeys, validUntil)

        val signingKeys = generateKeyPair()
        signingCertificate = certificate("CN=Pass Type ID: pass.at.example.tafel", signingKeys, "CN=Test WWDR", intermediateKeys, validUntil)

        val certificatePath = tempDir.resolve("pass.p12")
        val keyStore = KeyStore.getInstance("PKCS12").apply {
            load(null, null)
            setKeyEntry("pass", signingKeys.private, password.toCharArray(), arrayOf(signingCertificate))
        }
        Files.newOutputStream(certificatePath).use { keyStore.store(it, password.toCharArray()) }

        val wwdrPath = tempDir.resolve("wwdr.cer")
        Files.write(wwdrPath, intermediateCertificate.encoded)

        properties.wallet = TafelAdminWalletProperties().apply {
            passTypeIdentifier = "pass.at.example.tafel"
            teamIdentifier = "ABCDE12345"
            this.certificatePath = certificatePath.toString()
            certificatePassword = password
            wwdrCertificatePath = wwdrPath.toString()
        }
    }

    private fun generateKeyPair(): KeyPair = KeyPairGenerator.getInstance("RSA").apply { initialize(2048) }.generateKeyPair()

    private fun certificate(subject: String, subjectKeys: KeyPair, issuer: String, issuerKeys: KeyPair, validUntil: Instant): X509Certificate {
        val builder = JcaX509v3CertificateBuilder(
            X500Name(issuer),
            BigInteger.valueOf(System.nanoTime()),
            Date.from(validUntil.minus(365, ChronoUnit.DAYS)),
            Date.from(validUntil),
            X500Name(subject),
            subjectKeys.public,
        )
        return JcaX509CertificateConverter().getCertificate(builder.build(JcaContentSignerBuilder("SHA256withRSA").build(issuerKeys.private)))
    }

    private fun unzip(bytes: ByteArray): Map<String, ByteArray> {
        val files = linkedMapOf<String, ByteArray>()
        ZipInputStream(ByteArrayInputStream(bytes)).use { zip ->
            generateSequence { zip.nextEntry }.forEach { entry -> files[entry.name] = zip.readAllBytes() }
        }
        return files
    }
}
