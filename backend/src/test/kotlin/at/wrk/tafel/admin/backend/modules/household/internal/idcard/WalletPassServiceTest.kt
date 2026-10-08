package at.wrk.tafel.admin.backend.modules.household.internal.idcard

import at.wrk.tafel.admin.backend.modules.household.internal.masterdata.IdCardSummary
import org.assertj.core.api.Assertions.assertThat
import org.junit.jupiter.api.Test
import tools.jackson.databind.json.JsonMapper
import java.io.ByteArrayInputStream
import java.security.MessageDigest
import java.util.zip.ZipInputStream
import javax.imageio.ImageIO

class WalletPassServiceTest {

    private val summary = IdCardSummary(householdId = 4101, fullName = "Max Mustermann", countPersons = 3, countInfants = 1)
    private val service = WalletPassService()

    @Test
    fun `pass holds the household number as its qr code and the counts printed on the card`() {
        val files = unzip(service.generatePass(summary))

        val pass = JsonMapper.builder().build().readTree(files.getValue("pass.json"))
        assertThat(pass["formatVersion"].asInt()).isEqualTo(1)
        assertThat(pass["passTypeIdentifier"].asString()).isNotBlank()
        assertThat(pass["teamIdentifier"].asString()).isNotBlank()
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
    fun `the file is unsigned - a manifest and no signature`() {
        val files = unzip(service.generatePass(summary))

        assertThat(files.keys).containsExactly(
            "pass.json",
            "icon.png",
            "icon@2x.png",
            "icon@3x.png",
            "logo.png",
            "logo@2x.png",
            "manifest.json",
        )
    }

    @Test
    fun `manifest lists the sha1 of every file except itself`() {
        val files = unzip(service.generatePass(summary))

        val manifest = JsonMapper.builder().build().readTree(files.getValue("manifest.json"))
        val hashedFiles = files.keys - "manifest.json"

        assertThat(manifest.propertyNames()).containsExactlyInAnyOrderElementsOf(hashedFiles)
        hashedFiles.forEach { name ->
            val expected = MessageDigest.getInstance("SHA-1").digest(files.getValue(name)).joinToString("") { "%02x".format(it) }
            assertThat(manifest[name].asString()).describedAs(name).isEqualTo(expected)
        }
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

    private fun unzip(bytes: ByteArray): Map<String, ByteArray> {
        val files = linkedMapOf<String, ByteArray>()
        ZipInputStream(ByteArrayInputStream(bytes)).use { zip ->
            generateSequence { zip.nextEntry }.forEach { entry -> files[entry.name] = zip.readAllBytes() }
        }
        return files
    }
}
