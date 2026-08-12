import {Component, inject} from '@angular/core';
import {MAT_DIALOG_DATA, MatDialogRef} from '@angular/material/dialog';
import {MatButtonModule} from '@angular/material/button';
import {TafelDialogComponent} from '../../../../../common/components/tafel-dialog/tafel-dialog.component';
import {MailTypeEnum} from '../../../../../api/settings-api.service';

/** One mail type as the confirmation summarises it: who it would reach, or that it would reach nobody. */
export interface SendMailsDialogMailType {
  mailType: MailTypeEnum;
  label: string;
  recipients: string[];
}

export interface SendMailsDialogData {
  /** The distribution the mails belong to, formatted as it is shown in the dropdown. */
  distributionDate: string;
  mailTypes: SendMailsDialogMailType[];
}

/**
 * Confirms a resend by naming what it would actually do: which distribution's mails, of which
 * types, to which addresses.
 *
 * These mails carry the day's report and statistics to people outside the organisation, and the
 * button next to the dropdown otherwise sends the wrong day's report with one click on a
 * mis-selected date - which cannot be taken back afterwards.
 */
@Component({
  selector: 'tafel-send-mails-dialog',
  imports: [TafelDialogComponent, MatButtonModule],
  templateUrl: 'send-mails-dialog.component.html'
})
export class SendMailsDialogComponent {
  readonly dialogRef = inject(MatDialogRef<SendMailsDialogComponent, boolean>);
  readonly data: SendMailsDialogData = inject(MAT_DIALOG_DATA);
}
