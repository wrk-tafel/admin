import {Component, viewChild} from '@angular/core';
import {MailRecipientsComponent} from '../../components/mail-recipients/mail-recipients.component';
import {SendMailsComponent} from '../../components/send-mails/send-mails.component';
import {HasUnsavedChanges} from '../../../../common/util/unsaved-changes.guard';

@Component({
  selector: 'tafel-settings-email',
  templateUrl: 'settings-email.component.html',
  imports: [
    MailRecipientsComponent,
    SendMailsComponent
  ]
})
export class SettingsEmailComponent implements HasUnsavedChanges {
  private readonly mailRecipients = viewChild.required(MailRecipientsComponent);

  /** Answered for the whole screen by the one card on it that is edited - see `unsavedChangesGuard`. */
  hasUnsavedChanges(): boolean {
    return this.mailRecipients().hasUnsavedChanges();
  }

  /** A resend changes how the last mail of each type ended, which the recipients card reports. */
  protected onMailsSent() {
    this.mailRecipients().reloadMailStatus();
  }
}
