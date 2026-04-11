import {Component} from '@angular/core';
import {MailRecipientsComponent} from './components/mail-recipients/mail-recipients.component';
import {SendMailsComponent} from './components/send-dailyreport/send-mails.component';

@Component({
    selector: 'tafel-settings',
    templateUrl: 'settings.component.html',
    imports: [
        MailRecipientsComponent,
        SendMailsComponent
    ]
})
export class SettingsComponent {
}
