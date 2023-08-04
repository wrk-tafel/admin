package at.wrk.tafel.admin.backend.common.mail

import at.wrk.tafel.admin.backend.config.TafelAdminMailDailyReportProperties
import at.wrk.tafel.admin.backend.config.TafelAdminMailProperties
import at.wrk.tafel.admin.backend.config.TafelAdminProperties
import io.mockk.every
import io.mockk.impl.annotations.InjectMockKs
import io.mockk.impl.annotations.RelaxedMockK
import io.mockk.junit5.MockKExtension
import io.mockk.slot
import io.mockk.verify
import org.assertj.core.api.Assertions.assertThat
import org.junit.jupiter.api.Test
import org.junit.jupiter.api.extension.ExtendWith
import org.springframework.mail.SimpleMailMessage
import org.springframework.mail.javamail.JavaMailSender

@ExtendWith(MockKExtension::class)
internal class MailSenderServiceTest {

    @RelaxedMockK
    private lateinit var mailSender: JavaMailSender

    @RelaxedMockK
    private lateinit var properties: TafelAdminProperties

    @InjectMockKs
    private lateinit var service: MailSenderService

    @Test
    fun `sendTextMail - mailing disabled`() {
        val service = MailSenderService(null, TafelAdminProperties())
        service.sendTextMail("subject", "text")
    }

    @Test
    fun `sendTextMail successfully`() {
        val subject = "subj"
        val text = "txt"

        val mailProperties = TafelAdminMailProperties(
            from = "from-address",
            dailyreport = TafelAdminMailDailyReportProperties(
                to = listOf("to1@host.at", "to2@host.at"),
                bcc = listOf("bcc1@host.at", "bcc2@host.at")
            )
        )
        every { properties.mail } returns mailProperties

        service.sendTextMail(subject, text)

        val mailMessageSlot = slot<SimpleMailMessage>()
        verify { mailSender.send(capture(mailMessageSlot)) }

        val mailMessage = mailMessageSlot.captured
        assertThat(mailMessage).isNotNull
        assertThat(mailMessage.from).isEqualTo(mailProperties.from)
        assertThat(mailMessage.to).isEqualTo(mailProperties.dailyreport!!.to?.toTypedArray())
        assertThat(mailMessage.cc).isEqualTo(mailProperties.dailyreport!!.cc?.toTypedArray())
        assertThat(mailMessage.bcc).isEqualTo(mailProperties.dailyreport!!.bcc?.toTypedArray())
        assertThat(mailMessage.subject).isEqualTo(subject)
        assertThat(mailMessage.text).isEqualTo(text)
    }

}
