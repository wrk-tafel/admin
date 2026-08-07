package at.wrk.tafel.admin.backend.database.model.base

val testMailRecipient_DR_TO1 = MailRecipientEntity(
    mailType = MailType.DAILY_REPORT,
    recipientType = RecipientType.TO,
    address = "dailyreport-to1@domain.com",
).apply { id = 1 }

val testMailRecipient_DR_TO2 = MailRecipientEntity(
    mailType = MailType.DAILY_REPORT,
    recipientType = RecipientType.TO,
    address = "dailyreport-to2@domain.com",
).apply { id = 2 }

val testMailRecipient_DR_CC1 = MailRecipientEntity(
    mailType = MailType.DAILY_REPORT,
    recipientType = RecipientType.CC,
    address = "dailyreport-cc1@domain.com",
).apply { id = 3 }

val testMailRecipient_DR_CC2 = MailRecipientEntity(
    mailType = MailType.DAILY_REPORT,
    recipientType = RecipientType.CC,
    address = "dailyreport-cc2@domain.com",
).apply { id = 4 }

val testMailRecipient_DR_BCC1 = MailRecipientEntity(
    mailType = MailType.DAILY_REPORT,
    recipientType = RecipientType.BCC,
    address = "dailyreport-bcc1@domain.com",
).apply { id = 5 }

val testMailRecipient_DR_BCC2 = MailRecipientEntity(
    mailType = MailType.DAILY_REPORT,
    recipientType = RecipientType.BCC,
    address = "dailyreport-bcc2@domain.com",
).apply { id = 6 }
