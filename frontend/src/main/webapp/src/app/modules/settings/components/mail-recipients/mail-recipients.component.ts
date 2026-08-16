import {ChangeDetectorRef, Component, effect, inject} from '@angular/core';
import {MatCard, MatCardContent, MatCardFooter, MatCardHeader, MatCardTitle} from '@angular/material/card';
import {MatButtonModule} from '@angular/material/button';
import {MatTabsModule} from '@angular/material/tabs';
import {MatIconModule} from '@angular/material/icon';
import {MatTooltipModule} from '@angular/material/tooltip';
import {FormArray, FormBuilder, FormGroup, ReactiveFormsModule, Validators} from '@angular/forms';
import {CommonModule} from '@angular/common';
import {MailTypeEnum, RecipientTypeEnum, SettingsApiService} from '../../../../api/settings-api.service';
import {TafelToastrService} from '../../../../common/components/tafel-toastr/tafel-toastr.service';
import {isControlInvalid, isControlValid} from '../../../../common/util/reactive-form-helper';
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
    MatTooltipModule
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

  createAddressesPerTypeGroup(recipientType: RecipientTypeEnum, addresses: string[]): FormGroup {
    return this.fb.group({
      recipientType: this.fb.control<RecipientTypeEnum>(recipientType),
      addresses: this.fb.array(
        addresses.map(address => this.createAddressControl(address))
      )
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
    addresses.push(this.createAddressControl(''));

    this.form.markAllAsTouched();
  }

  removeAddress(mailTypeIndex: number, recipientTypeIndex: number, addressIndex: number) {
    const recipientsPerMailType = this.getRecipientsForMailTypeIndex(mailTypeIndex);
    (recipientsPerMailType.at(recipientTypeIndex).get('addresses') as FormArray).removeAt(addressIndex);
  }

  save() {
    this.form.markAllAsTouched();

    if (this.form.valid) {
      const observer = {
        next: () => {
          this.toastr.success('Einstellungen gespeichert!');
        },
        error: () => {
          this.toastr.error('Speichern fehlgeschlagen!');
        },
      };
      this.settingsApiService.saveMailRecipients(this.form.getRawValue()).subscribe(observer);
    }
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
  protected readonly isControlValid = isControlValid;
}
