import {Component, ChangeDetectionStrategy} from '@angular/core';
import {MailRecipientsComponent} from '../../components/mail-recipients/mail-recipients.component';
import {SendMailsComponent} from '../../components/send-mails/send-mails.component';

@Component({
  selector: 'tafel-settings-email',
  templateUrl: 'settings-email.component.html',
  changeDetection: ChangeDetectionStrategy.Eager,
  imports: [
    MailRecipientsComponent,
    SendMailsComponent
  ]
})
export class SettingsEmailComponent {
}
