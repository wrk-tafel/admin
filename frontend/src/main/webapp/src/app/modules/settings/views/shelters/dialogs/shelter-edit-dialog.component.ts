import {Component, inject, ChangeDetectorRef} from '@angular/core';
import {MAT_DIALOG_DATA, MatDialogRef} from '@angular/material/dialog';
import {TafelDialogComponent} from '../../../../../common/components/tafel-dialog/tafel-dialog.component';
import {FormArray, FormBuilder, ReactiveFormsModule, Validators} from '@angular/forms';
import {CommonModule} from '@angular/common';
import {MatFormFieldModule} from '@angular/material/form-field';
import {MatInputModule} from '@angular/material/input';
import {MatCheckboxModule} from '@angular/material/checkbox';
import {MatButton} from '@angular/material/button';
import {ShelterItem, ShelterContact} from '../../../../../api/shelter-api.service';
import {MatDividerModule} from '@angular/material/divider';

export interface ShelterEditDialogData {
  shelter: ShelterItem;
}

@Component({
  selector: 'tafel-shelter-edit-dialog',
  templateUrl: 'shelter-edit-dialog.component.html',
  imports: [
    CommonModule,
    TafelDialogComponent,
    ReactiveFormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatCheckboxModule,
    MatButton,
    MatDividerModule
  ]
})
export class ShelterEditDialogComponent {
  readonly dialogRef = inject(MatDialogRef<ShelterEditDialogComponent>);
  readonly data: ShelterEditDialogData = inject(MAT_DIALOG_DATA);
  private readonly fb = inject(FormBuilder);
  private readonly cd = inject(ChangeDetectorRef);

  form = this.fb.group({
    id: [this.data.shelter?.id, []],
    name: [this.data.shelter?.name ?? '', [Validators.required]],
    addressStreet: [this.data.shelter?.addressStreet ?? '', [Validators.required]],
    addressHouseNumber: [this.data.shelter?.addressHouseNumber ?? '', [Validators.required]],
    addressStairway: [this.data.shelter?.addressStairway ?? ''],
    addressDoor: [this.data.shelter?.addressDoor ?? ''],
    addressPostalCode: [this.data.shelter?.addressPostalCode ?? null, [Validators.required]],
    addressCity: [this.data.shelter?.addressCity ?? '', [Validators.required]],
    note: [this.data.shelter?.note ?? ''],
    personsCount: [this.data.shelter?.personsCount ?? '', [Validators.required]],
    enabled: [this.data.shelter?.enabled ?? true],
    contacts: this.fb.array((this.data.shelter?.contacts ?? []).map(c => this.createContactGroup(c)))
  });

  createContactGroup(c?: ShelterContact) {
    return this.fb.group({
      firstname: [c?.firstname ?? ''],
      lastname: [c?.lastname ?? ''],
      phone: [c?.phone ?? '', [Validators.required]]
    });
  }

  get contacts(): FormArray {
    return this.form.get('contacts') as FormArray;
  }

  addContact() {
    this.contacts.push(this.createContactGroup());
    // ensure form state updated and view refreshed
    this.contacts.updateValueAndValidity();
    this.form.updateValueAndValidity();
    this.cd.detectChanges();
  }

  removeContact(index: number) {
    this.contacts.removeAt(index);
    this.contacts.updateValueAndValidity();
    this.form.updateValueAndValidity();
    this.cd.detectChanges();
  }

  save() {
    if (!this.form.valid) {
      this.form.markAllAsTouched();
    } else {
      this.dialogRef.close(this.form.value as ShelterItem);
    }
  }

  cancel() {
    this.dialogRef.close();
  }
}
