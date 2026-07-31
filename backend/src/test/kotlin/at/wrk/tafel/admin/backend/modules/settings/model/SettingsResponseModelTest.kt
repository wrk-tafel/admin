package at.wrk.tafel.admin.backend.modules.settings.model

import at.wrk.tafel.admin.backend.common.validation.BeanValidationTestSupport.validator
import org.assertj.core.api.Assertions.assertThat
import org.junit.jupiter.api.Test

class SettingsResponseModelTest {

    @Test
    fun `mail recipients per mail type with blank mailType is invalid`() {
        val item = MailRecipientsPerMailType(mailType = "", recipients = emptyList())

        val violations = validator.validate(item)

        assertThat(violations).extracting<String> { it.propertyPath.toString() }
            .containsExactly("mailType")
    }

    @Test
    fun `mail recipients cascades into nested mail type`() {
        val recipients = MailRecipients(
            mailRecipients = listOf(MailRecipientsPerMailType(mailType = "", recipients = emptyList())),
        )

        val violations = validator.validate(recipients)

        assertThat(violations).extracting<String> { it.propertyPath.toString() }
            .containsExactly("mailRecipients[0].mailType")
    }

    @Test
    fun `mail recipients with filled fields is valid`() {
        val recipients = MailRecipients(
            mailRecipients = listOf(
                MailRecipientsPerMailType(
                    mailType = "DISTRIBUTION",
                    recipients = listOf(
                        MailRecipientAdresses(recipientType = MailRecipientType.TO, addresses = listOf("test@example.com")),
                    ),
                ),
            ),
        )

        val violations = validator.validate(recipients)

        assertThat(violations).isEmpty()
    }
}
