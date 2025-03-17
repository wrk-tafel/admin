package at.wrk.tafel.admin.backend.database.model.base

val testMailRecipient_DR_TO1 = MailRecipientEntity().apply {
    id = 1
    mailType = MailType.DAILY_REPORT
    recipientType = RecipientType.TO
    address = "dailyreport-to1@domain.com"
}

val testMailRecipient_DR_TO2 = MailRecipientEntity().apply {
    id = 2
    mailType = MailType.DAILY_REPORT
    recipientType = RecipientType.TO
    address = "dailyreport-to2@domain.com"
}

val testMailRecipient_DR_CC1 = MailRecipientEntity().apply {
    id = 3
    mailType = MailType.DAILY_REPORT
    recipientType = RecipientType.CC
    address = "dailyreport-cc1@domain.com"
}

val testMailRecipient_DR_CC2 = MailRecipientEntity().apply {
    id = 4
    mailType = MailType.DAILY_REPORT
    recipientType = RecipientType.CC
    address = "dailyreport-cc2@domain.com"
}

val testMailRecipient_DR_BCC1 = MailRecipientEntity().apply {
    id = 5
    mailType = MailType.DAILY_REPORT
    recipientType = RecipientType.BCC
    address = "dailyreport-bcc1@domain.com"
}

val testMailRecipient_DR_BCC2 = MailRecipientEntity().apply {
    id = 6
    mailType = MailType.DAILY_REPORT
    recipientType = RecipientType.BCC
    address = "dailyreport-bcc2@domain.com"
}
