import {ChangeDetectorRef, Component, effect, inject} from '@angular/core';
import {MatCard, MatCardContent, MatCardFooter, MatCardHeader, MatCardTitle} from '@angular/material/card';
import {MatButtonModule} from '@angular/material/button';
import {MatTabsModule} from '@angular/material/tabs';
import {MatIconModule} from '@angular/material/icon';
import {MatTooltipModule} from '@angular/material/tooltip';
import {MatFormFieldModule} from '@angular/material/form-field';
import {MatInputModule} from '@angular/material/input';
import {FormArray, FormBuilder, FormGroup, ReactiveFormsModule, Validators} from '@angular/forms';
import {CommonModule} from '@angular/common';
import {
  MailRecipientAddressItem,
  MailRecipients,
  MailTypeEnum,
  RecipientTypeEnum,
  SettingsApiService
} from '../../../../api/settings-api.service';
import {TafelToastrService} from '../../../../common/components/tafel-toastr/tafel-toastr.service';
import {isControlInvalid} from '../../../../common/util/reactive-form-helper';
import {registerSvgIcons} from '../../../../common/util/svg-icon.util';
import mailIcon from '@material-symbols/svg-400/outlined/mail-fill.svg';
import addIcon from '@material-symbols/svg-400/outlined/add-fill.svg';
import deleteIcon from '@material-symbols/svg-400/outlined/delete-fill.svg';

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
    MatIconModule,
    ReactiveFormsModule,
    CommonModule,
    MatTooltipModule,
    MatFormFieldModule,
    MatInputModule
  ]
})
export class MailRecipientsComponent {
  private readonly registerIcons = registerSvgIcons({mail: mailIcon, add: addIcon, delete: deleteIcon});

  private readonly settingsApiService = inject(SettingsApiService);
  private readonly fb = inject(FormBuilder);
  private readonly toastr = inject(TafelToastrService);
  private readonly cdr = inject(ChangeDetectorRef);

  form: FormGroup = this.fb.group({
    mailRecipients: this.fb.array([])
  });

  constructor() {
    // Load mail recipients on component initialization
    effect(() => {
      this.settingsApiService.getMailRecipients().subscribe(response => {
        Object.values(MailTypeEnum).forEach((mailType: MailTypeEnum) => {
          this.mailRecipientArray.push(
            this.fb.group({
              mailType: this.fb.control<MailTypeEnum>(mailType),
              recipients: this.fb.array(
                Object.values(RecipientTypeEnum).map((recipientType: RecipientTypeEnum) => {
                  const addressesOfType = response.mailRecipients
                    .filter(recipient => recipient.mailType === mailType)
                    .flatMap(recipient => recipient.recipients)
                    .filter(recipient => recipient.recipientType === recipientType)
                    .flatMap(recipient => recipient.addresses);

                  return this.createAddressesPerTypeGroup(recipientType, addressesOfType);
                })
              )
            })
          );
        });

        this.form.markAllAsTouched();
        this.cdr.markForCheck();
      });
    });
  }

  createAddressesPerTypeGroup(recipientType: RecipientTypeEnum, addresses: MailRecipientAddressItem[]): FormGroup {
    return this.fb.group({
      recipientType: this.fb.control<RecipientTypeEnum>(recipientType),
      addresses: this.fb.array(
        addresses.map(address => this.createAddressGroup(address))
      )
    });
  }

  private createAddressGroup(item: MailRecipientAddressItem): FormGroup {
    return this.fb.group({
      id: this.fb.control<number | null>(item.id),
      address: this.createAddressControl(item.address)
    });
  }

  private createAddressControl(address: string) {
    return this.fb.control<string>(address, [
      Validators.required,
      Validators.minLength(5),
      Validators.email
    ]);
  }

  addAddress(mailTypeIndex: number, recipientTypeIndex: number) {
    const addresses = this.getAddressesOfRecipientTypeIndex(mailTypeIndex, recipientTypeIndex);
    addresses.push(this.createAddressGroup({id: null, address: ''}));

    this.form.markAllAsTouched();
  }

  /**
   * A row already persisted (has an id) is deleted immediately via a real REST call - there is no
   * "Speichern" step for a deletion. A row added but not yet saved (id is still null) only exists in
   * the form, so it's just spliced out locally.
   */
  removeAddress(mailTypeIndex: number, recipientTypeIndex: number, addressIndex: number) {
    const addresses = this.getAddressesOfRecipientTypeIndex(mailTypeIndex, recipientTypeIndex);
    const id = addresses.at(addressIndex).get('id')!.value as number | null;

    if (id === null) {
      addresses.removeAt(addressIndex);
      return;
    }

    this.settingsApiService.deleteMailRecipient(id).subscribe({
      next: () => {
        addresses.removeAt(addressIndex);
        this.toastr.success('E-Mail Adresse entfernt!');
      },
      error: () => this.toastr.error('Entfernen fehlgeschlagen!')
    });
  }

  save() {
    this.form.markAllAsTouched();

    if (this.form.valid) {
      const observer = {
        next: (response: MailRecipients) => {
          this.toastr.success('Einstellungen gespeichert!');
          this.applySavedIds(response);
        },
        error: () => {
          this.toastr.error('Speichern fehlgeschlagen!');
        },
      };
      this.settingsApiService.saveMailRecipients(this.form.getRawValue()).subscribe(observer);
    }
  }

  /**
   * A freshly added address is submitted with id null and only gets a real id once persisted - patch
   * it into the still-mounted form (rather than reloading, which would reset the selected tab) so the
   * row becomes immediately deletable via removeAddress() without a page refresh. Matched by address
   * value rather than array position - the backend's response order isn't guaranteed to match the
   * form's, and pairing by index would silently assign the wrong row's id.
   */
  private applySavedIds(response: MailRecipients) {
    this.mailRecipientArray.controls.forEach(mailTypeGroup => {
      const mailType = mailTypeGroup.value.mailType as MailTypeEnum;
      const recipientsArray = mailTypeGroup.get('recipients') as FormArray;

      recipientsArray.controls.forEach(recipientGroup => {
        const recipientType = recipientGroup.value.recipientType as RecipientTypeEnum;
        const addressesArray = recipientGroup.get('addresses') as FormArray;

        const knownIds = new Set(
          addressesArray.controls
            .map(addressGroup => addressGroup.get('id')!.value as number | null)
            .filter((id): id is number => id !== null)
        );

        const newlyAssignedEntries = response.mailRecipients
          .filter(recipient => recipient.mailType === mailType)
          .flatMap(recipient => recipient.recipients)
          .filter(recipient => recipient.recipientType === recipientType)
          .flatMap(recipient => recipient.addresses)
          .filter((address): address is MailRecipientAddressItem & { id: number } => address.id !== null && !knownIds.has(address.id));

        const unsavedGroups = addressesArray.controls.filter(addressGroup => addressGroup.get('id')!.value === null);
        unsavedGroups.forEach(addressGroup => {
          const addressValue = addressGroup.get('address')!.value as string;
          const matchIndex = newlyAssignedEntries.findIndex(entry => entry.address === addressValue);
          if (matchIndex !== -1) {
            const [matchedEntry] = newlyAssignedEntries.splice(matchIndex, 1);
            addressGroup.get('id')!.setValue(matchedEntry.id, {emitEvent: false});
          }
        });
      });
    });
  }

  get mailRecipientArray(): FormArray {
    return this.form.get('mailRecipients') as FormArray;
  }

  getRecipientsForMailTypeIndex(mailTypeIndex: number): FormArray {
    return this.mailRecipientArray.controls.at(mailTypeIndex)!.get('recipients') as FormArray;
  }

  getAddressesOfRecipientTypeIndex(mailTypeIndex: number, recipientTypeIndex: number): FormArray {
    return this.getRecipientsForMailTypeIndex(mailTypeIndex).controls.at(recipientTypeIndex)!.get('addresses') as FormArray;
  }

  MailTypeLabels: Record<MailTypeEnum, string> = {
    [MailTypeEnum.DAILY_REPORT]: 'Tagesreport',
    [MailTypeEnum.STATISTICS]: 'Statistiken',
    [MailTypeEnum.RETURN_BOXES]: 'Retourkisten'
  };

  RecipientTypeLabels: Record<RecipientTypeEnum, string> = {
    [RecipientTypeEnum.TO]: 'Empfänger (AN)',
    [RecipientTypeEnum.CC]: 'Kopie (CC)',
    [RecipientTypeEnum.BCC]: 'Blindkopie (BCC)'
  };

  getMailTypeLabel(mailType: MailTypeEnum): string {
    return this.MailTypeLabels[mailType];
  }

  getRecipientTypeLabel(recipientType: RecipientTypeEnum): string {
    return this.RecipientTypeLabels[recipientType];
  }

  protected readonly isControlInvalid = isControlInvalid;
}
