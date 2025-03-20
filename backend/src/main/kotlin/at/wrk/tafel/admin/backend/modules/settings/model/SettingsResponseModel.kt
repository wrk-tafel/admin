package at.wrk.tafel.admin.backend.modules.settings.model

import at.wrk.tafel.admin.backend.common.ExcludeFromTestCoverage

@ExcludeFromTestCoverage
data class MailType(
    val name: String,
    val label: String,
)

@ExcludeFromTestCoverage
data class MailRecipientSettings(
    val settings: List<MailRecipientSetting>,
)

@ExcludeFromTestCoverage
data class MailRecipientSetting(
    val mailType: MailType,
    val recipients: Map<String, List<String>>,
)
