import {Component, inject, LOCALE_ID, output, signal} from '@angular/core';
import {MatCard, MatCardContent, MatCardFooter, MatCardHeader, MatCardTitle} from '@angular/material/card';
import {MatButtonModule} from '@angular/material/button';
import {MatSelect, MatSelectModule} from '@angular/material/select';
import {MatIconModule} from '@angular/material/icon';
import {MatInputModule} from '@angular/material/input';
import {MatDatepickerModule} from '@angular/material/datepicker';
import {MatDialog} from '@angular/material/dialog';
import {DistributionApiService, DistributionItem} from '../../../../api/distribution-api.service';
import {MailTypeEnum, RecipientTypeEnum, SettingsApiService} from '../../../../api/settings-api.service';
import {DatePipe} from '@angular/common';
import {FormsModule} from '@angular/forms';
import {FaIconComponent} from '@fortawesome/angular-fontawesome';
import {faEnvelope} from '@fortawesome/free-solid-svg-icons';
import {TafelToastrService} from '../../../../common/components/tafel-toastr/tafel-toastr.service';
import {mailTypeSpecs} from '../mail-recipients/mail-types';
import {SendMailsDialogComponent, SendMailsDialogData} from './dialogs/send-mails-dialog.component';

const DATE_FORMAT = 'dd.MM.yyyy';

/**
 * Sends the mails of an already closed distribution again.
 *
 * Confirmed before it runs and reported afterwards: the mails leave the building for real, so which
 * day and which addresses are involved is shown before the send, and how many mails were actually
 * queued is shown after it - "none" is a possible and important answer, since a mail type without
 * recipients produces nothing at all.
 */
@Component({
  selector: 'tafel-send-mails',
  templateUrl: 'send-mails.component.html',
  imports: [
    MatCard,
    MatCardHeader,
    MatCardTitle,
    MatCardContent,
    MatButtonModule,
    MatSelect,
    MatSelectModule,
    MatIconModule,
    MatInputModule,
    MatDatepickerModule,
    FormsModule,
    DatePipe,
    FaIconComponent,
    MatCardFooter
  ]
})
export class SendMailsComponent {
  private readonly distributionApiService = inject(DistributionApiService);
  private readonly settingsApiService = inject(SettingsApiService);
  private readonly toastr = inject(TafelToastrService);
  private readonly dialog = inject(MatDialog);
  private readonly datePipe = new DatePipe(inject(LOCALE_ID));

  /** Announces that the queue has changed, so the recipients card can re-read its delivery status. */
  readonly mailsSent = output<void>();

  readonly distributions = signal<DistributionItem[]>([]);
  readonly selectedDistribution = signal<DistributionItem | null>(null);

  constructor() {
    this.distributionApiService.getDistributions().subscribe((response) => {
      const distributions = response.items;
      this.distributions.set(distributions);

      if (distributions.length > 0) {
        this.selectedDistribution.set(distributions[0]);
      }
    });
  }

  /**
   * Reads the current recipients so the confirmation can name them, then asks. The addresses are
   * fetched here rather than passed in: they are what the send will actually use, and the card next
   * to this one may be showing edits that have not been saved.
   */
  protected confirmSendMails() {
    const distribution = this.selectedDistribution();
    if (!distribution) {
      return;
    }

    this.settingsApiService.getMailRecipients().subscribe({
      next: response => {
        const data: SendMailsDialogData = {
          distributionDate: this.datePipe.transform(distribution.startedAt, DATE_FORMAT) ?? '',
          mailTypes: Object.values(MailTypeEnum).map(mailType => ({
            mailType,
            label: mailTypeSpecs[mailType].label,
            recipients: response.mailRecipients
              .filter(recipient => recipient.mailType === mailType)
              .flatMap(recipient => recipient.recipients)
              .filter(recipient => recipient.recipientType === RecipientTypeEnum.TO)
              .flatMap(recipient => recipient.addresses)
          }))
        };

        this.dialog.open(SendMailsDialogComponent, {width: '600px', data})
          .afterClosed()
          .subscribe(confirmed => {
            if (confirmed) {
              this.sendMails(distribution);
            }
          });
      },
      error: () => this.toastr.error('Empfänger konnten nicht geladen werden!', 'Fehler')
    });
  }

  private sendMails(distribution: DistributionItem) {
    this.distributionApiService.sendMails(distribution.id).subscribe({
      next: response => {
        if (response.queuedMails > 0) {
          const mails = response.queuedMails === 1 ? '1 E-Mail wurde' : `${response.queuedMails} E-Mails wurden`;
          this.toastr.success(`${mails} zum Versand eingereiht!`);
        } else {
          this.toastr.warning('Es wurde keine E-Mail eingereiht — es sind keine Empfänger hinterlegt '
            + 'oder es ist kein Mailserver konfiguriert.');
        }
        this.mailsSent.emit();
      },
      error: () => this.toastr.error('Senden der E-Mails fehlgeschlagen!')
    });
  }

  protected readonly faEnvelope = faEnvelope;
}
