import {Component, computed, inject, signal} from '@angular/core';
import {DatePipe} from '@angular/common';
import {MatCard, MatCardContent, MatCardFooter, MatCardHeader, MatCardTitle} from '@angular/material/card';
import {MatButtonModule} from '@angular/material/button';
import {MatTabsModule} from '@angular/material/tabs';
import {MatChipInputEvent, MatChipsModule} from '@angular/material/chips';
import {MatFormFieldModule} from '@angular/material/form-field';
import {MatInputModule} from '@angular/material/input';
import {faCircleCheck, faClock, faEnvelope, faTriangleExclamation, faXmark} from '@fortawesome/free-solid-svg-icons';
import {FaIconComponent} from '@fortawesome/angular-fontawesome';
import {
  MailOutboxStatusEnum,
  MailStatusItem,
  MailTypeEnum,
  RecipientTypeEnum,
  SettingsApiService
} from '../../../../api/settings-api.service';
import {TafelToastrService} from '../../../../common/components/tafel-toastr/tafel-toastr.service';
import {isValidMailAddress, mailTypeSpecs, recipientTypeLabels} from './mail-types';

/** The addresses of one TO/CC/BCC slot of one mail type. */
interface RecipientSlot {
  recipientType: RecipientTypeEnum;
  addresses: string[];
}

interface MailTypeRecipients {
  mailType: MailTypeEnum;
  slots: RecipientSlot[];
}

/** One address as it is rendered: invalid ones can only come from the database - see [addAddress]. */
export interface AddressView {
  address: string;
  valid: boolean;
}

export interface RecipientSlotView {
  recipientType: RecipientTypeEnum;
  label: string;
  addresses: AddressView[];
}

export interface MailTypeTabView {
  mailType: MailTypeEnum;
  label: string;
  description: string;
  /** No TO address at all - the mail is composed and then delivered to nobody. */
  hasNoRecipients: boolean;
  hasInvalidAddress: boolean;
  slots: RecipientSlotView[];
}

/** How the last mail of a type ended, in the words and colour the tab shows it in. */
export interface MailStatusView {
  text: string;
  severity: 'success' | 'danger' | 'warning' | 'info' | 'unknown';
}

const RECIPIENT_TYPE_ORDER = [RecipientTypeEnum.TO, RecipientTypeEnum.CC, RecipientTypeEnum.BCC];

/**
 * Maintains who receives which of the automatically sent mails.
 *
 * Addresses are chips rather than a column of inputs: an address is either well-formed and part of
 * the list or it is rejected while it is being typed, which is what keeps a slot's contents readable
 * once there are more than one or two of them. An address that is *already* stored and does not
 * parse is still shown - as an invalid chip, marking its tab - because it is the one thing an admin
 * has to be able to find and remove.
 *
 * The screen also answers the question that brings people here in the first place: whether the last
 * mail of each type actually left the building (see [mailStatus]). Recipients without delivery is
 * exactly the state that goes unnoticed otherwise.
 */
@Component({
  selector: 'tafel-mail-recipients',
  templateUrl: 'mail-recipients.component.html',
  imports: [
    MatCard,
    MatCardHeader,
    MatCardTitle,
    MatCardContent,
    MatCardFooter,
    MatButtonModule,
    MatTabsModule,
    MatChipsModule,
    MatFormFieldModule,
    MatInputModule,
    FaIconComponent,
    DatePipe
  ]
})
export class MailRecipientsComponent {
  private readonly settingsApiService = inject(SettingsApiService);
  private readonly toastr = inject(TafelToastrService);

  private readonly recipients = signal<MailTypeRecipients[]>([]);

  /**
   * What was last loaded or saved. Comparing against it answers "are there unsaved changes?" for
   * real - an address that is added and removed again leaves the screen clean, where a flag set on
   * the first edit would keep claiming otherwise.
   */
  private readonly savedRecipients = signal<string>('[]');

  private readonly mailStatus = signal<MailStatusItem[]>([]);

  /** The rejected input per slot, keyed by [slotKey] - shown under the slot it was typed into. */
  private readonly inputErrors = signal<Record<string, string>>({});

  readonly hasUnsavedChanges = computed(() => JSON.stringify(this.recipients()) !== this.savedRecipients());

  protected readonly tabs = computed<MailTypeTabView[]>(() => this.recipients().map(entry => {
    const slots = entry.slots.map(slot => ({
      recipientType: slot.recipientType,
      label: recipientTypeLabels[slot.recipientType],
      addresses: slot.addresses.map(address => ({address, valid: isValidMailAddress(address)}))
    }));

    return {
      mailType: entry.mailType,
      label: mailTypeSpecs[entry.mailType].label,
      description: mailTypeSpecs[entry.mailType].description,
      hasNoRecipients: this.addressesOf(entry, RecipientTypeEnum.TO).length === 0,
      hasInvalidAddress: slots.some(slot => slot.addresses.some(address => !address.valid)),
      slots
    };
  }));

  protected readonly statusPerMailType = computed<Record<string, MailStatusView>>(() => {
    const views: Record<string, MailStatusView> = {};
    this.mailStatus().forEach(status => views[status.mailType] = this.toStatusView(status));
    return views;
  });

  constructor() {
    this.loadRecipients();
    this.loadMailStatus();
  }

  /** Re-reads how the mails ended - the resend next to this card changes that answer. */
  reloadMailStatus() {
    this.loadMailStatus();
  }

  private loadRecipients() {
    this.settingsApiService.getMailRecipients().subscribe({
      next: response => {
        const recipients = Object.values(MailTypeEnum).map(mailType => ({
          mailType,
          slots: RECIPIENT_TYPE_ORDER.map(recipientType => ({
            recipientType,
            addresses: response.mailRecipients
              .filter(recipient => recipient.mailType === mailType)
              .flatMap(recipient => recipient.recipients)
              .filter(recipient => recipient.recipientType === recipientType)
              .flatMap(recipient => recipient.addresses)
          }))
        }));

        this.recipients.set(recipients);
        this.savedRecipients.set(JSON.stringify(recipients));
        this.inputErrors.set({});
      },
      error: () => this.toastr.error('Empfänger konnten nicht geladen werden!', 'Fehler')
    });
  }

  private loadMailStatus() {
    this.settingsApiService.getMailStatus().subscribe({
      next: response => this.mailStatus.set(response.mailStatus),
      // Deliberately quiet: the status is additional information about the mails, and failing to
      // read it must not look like the recipients themselves could not be loaded.
      error: () => this.mailStatus.set([])
    });
  }

  /**
   * Turns what was typed into a chip, or explains why it did not become one. Rejected input stays
   * in the field so it can be corrected rather than retyped.
   */
  protected addAddress(event: MatChipInputEvent, mailType: MailTypeEnum, recipientType: RecipientTypeEnum) {
    const address = (event.value ?? '').trim();
    const key = this.slotKey(mailType, recipientType);

    if (address.length === 0) {
      this.clearInputError(key);
      event.chipInput.clear();
      return;
    }

    if (!isValidMailAddress(address)) {
      this.setInputError(key, 'Ungültige E-Mail Adresse');
      return;
    }

    const existing = this.addressesOf(this.recipients().find(entry => entry.mailType === mailType)!, recipientType);
    if (existing.some(value => value.toLowerCase() === address.toLowerCase())) {
      this.setInputError(key, 'Diese Adresse ist bereits hinterlegt');
      return;
    }

    this.updateAddresses(mailType, recipientType, addresses => [...addresses, address]);
    this.clearInputError(key);
    event.chipInput.clear();
  }

  protected removeAddress(mailType: MailTypeEnum, recipientType: RecipientTypeEnum, address: string) {
    this.updateAddresses(mailType, recipientType, addresses => addresses.filter(value => value !== address));
  }

  protected save() {
    const recipients = this.recipients();

    this.settingsApiService.saveMailRecipients({
      mailRecipients: recipients.map(entry => ({
        mailType: entry.mailType,
        recipients: entry.slots.map(slot => ({recipientType: slot.recipientType, addresses: slot.addresses}))
      }))
    }).subscribe({
      next: () => {
        this.savedRecipients.set(JSON.stringify(recipients));
        this.toastr.success('Einstellungen gespeichert!');
      },
      error: () => this.toastr.error('Speichern fehlgeschlagen!')
    });
  }

  protected inputError(mailType: MailTypeEnum, recipientType: RecipientTypeEnum): string | null {
    return this.inputErrors()[this.slotKey(mailType, recipientType)] ?? null;
  }

  protected slotKey(mailType: MailTypeEnum, recipientType: RecipientTypeEnum): string {
    return `${mailType}-${recipientType}`;
  }

  private setInputError(key: string, message: string) {
    this.inputErrors.update(errors => ({...errors, [key]: message}));
  }

  private clearInputError(key: string) {
    this.inputErrors.update(errors => Object.fromEntries(
      Object.entries(errors).filter(([errorKey]) => errorKey !== key)
    ));
  }

  private updateAddresses(
    mailType: MailTypeEnum,
    recipientType: RecipientTypeEnum,
    change: (addresses: string[]) => string[]
  ) {
    this.recipients.update(entries => entries.map(entry => entry.mailType === mailType
      ? {
        ...entry,
        slots: entry.slots.map(slot => slot.recipientType === recipientType
          ? {...slot, addresses: change(slot.addresses)}
          : slot)
      }
      : entry));
  }

  private addressesOf(entry: MailTypeRecipients, recipientType: RecipientTypeEnum): string[] {
    return entry.slots.find(slot => slot.recipientType === recipientType)?.addresses ?? [];
  }

  /**
   * A queued mail that already carries an error is one the outbox is retrying, not one that is
   * simply waiting - told apart because "wartet seit gestern" is what an unnoticed delivery
   * problem looks like from here.
   */
  private toStatusView(status: MailStatusItem): MailStatusView {
    switch (status.status) {
      case MailOutboxStatusEnum.SENT:
        return {text: 'Zuletzt versendet', severity: 'success'};
      case MailOutboxStatusEnum.PENDING:
        return status.lastError
          ? {text: 'Versand fehlgeschlagen, wird erneut versucht — eingereiht', severity: 'warning'}
          : {text: 'Wartet auf Versand seit', severity: 'info'};
      case MailOutboxStatusEnum.FAILED:
        return {text: 'Versand endgültig fehlgeschlagen', severity: 'danger'};
      default:
        return {text: 'Bisher wurde keine Mail dieser Art versendet.', severity: 'unknown'};
    }
  }

  protected statusOf(mailType: MailTypeEnum): MailStatusView | null {
    return this.statusPerMailType()[mailType] ?? null;
  }

  protected statusItemOf(mailType: MailTypeEnum): MailStatusItem | null {
    return this.mailStatus().find(status => status.mailType === mailType) ?? null;
  }

  protected readonly faEnvelope = faEnvelope;
  protected readonly faXmark = faXmark;
  protected readonly faTriangleExclamation = faTriangleExclamation;
  protected readonly faCircleCheck = faCircleCheck;
  protected readonly faClock = faClock;
}
