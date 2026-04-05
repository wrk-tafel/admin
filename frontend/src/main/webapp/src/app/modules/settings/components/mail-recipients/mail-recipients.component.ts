import {Component, effect, inject} from '@angular/core';
import {
  ButtonDirective,
  CardBodyComponent,
  CardComponent,
  CardFooterComponent,
  CardHeaderComponent,
  ColComponent,
  RowComponent,
} from '@coreui/angular';
import {MatTabsModule} from '@angular/material/tabs';
import {IconDirective} from '@coreui/icons-angular';
import {cilEnvelopeClosed} from '@coreui/icons';
import {FaIconComponent} from '@fortawesome/angular-fontawesome';
import {FormArray, FormBuilder, FormGroup, ReactiveFormsModule, Validators} from '@angular/forms';
import {faPlus, faTrashCan} from '@fortawesome/free-solid-svg-icons';
import {CommonModule} from '@angular/common';
import {MailTypeEnum, RecipientTypeEnum, SettingsApiService} from '../../../../api/settings-api.service';
import {ToastrService} from 'ngx-toastr';

@Component({
  selector: 'tafel-mail-recipients',
  templateUrl: 'mail-recipients.component.html',
  imports: [
    CardComponent,
    CardHeaderComponent,
    CardBodyComponent,
    CardFooterComponent,
    RowComponent,
    ColComponent,
    IconDirective,
    ButtonDirective,
    FaIconComponent,
    ReactiveFormsModule,
    MatTabsModule,
    CommonModule
  ]
})
export class MailRecipientsComponent {
  private readonly settingsApiService = inject(SettingsApiService);
  private readonly fb = inject(FormBuilder);
  private readonly toastr = inject(ToastrService);

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
    addresses.push(this.createAddressControl(undefined));

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
        error: error => {
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
    return this.mailRecipientArray.controls.at(mailTypeIndex).get('recipients') as FormArray;
  }

  getAddressesOfRecipientTypeIndex(mailTypeIndex: number, recipientTypeIndex: number): FormArray {
    return this.getRecipientsForMailTypeIndex(mailTypeIndex).controls.at(recipientTypeIndex).get('addresses') as FormArray;
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

  protected readonly faTrashCan = faTrashCan;
  protected readonly faPlus = faPlus;
  protected readonly cilEnvelopeClosed = cilEnvelopeClosed;
}
