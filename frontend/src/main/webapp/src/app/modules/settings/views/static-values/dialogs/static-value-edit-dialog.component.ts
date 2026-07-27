import {Component, inject} from '@angular/core';
import {MAT_DIALOG_DATA, MatDialogRef} from '@angular/material/dialog';
import {TafelDialogComponent} from '../../../../../common/components/tafel-dialog/tafel-dialog.component';
import {FormBuilder, ReactiveFormsModule, Validators} from '@angular/forms';
import {CommonModule} from '@angular/common';
import {MatFormFieldModule} from '@angular/material/form-field';
import {MatInputModule} from '@angular/material/input';
import {MatSelectModule} from '@angular/material/select';
import {MatButton} from '@angular/material/button';
import {StaticValueItem, StaticValueTypeEnum} from '../../../../../api/settings-api.service';
import {staticValueTypeOptions} from '../static-value-type-labels';

export interface StaticValueEditDialogData {
  staticValue: StaticValueItem;
}

@Component({
  selector: 'tafel-static-value-edit-dialog',
  templateUrl: 'static-value-edit-dialog.component.html',
  imports: [
    CommonModule,
    TafelDialogComponent,
    ReactiveFormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatButton
  ]
})
export class StaticValueEditDialogComponent {
  readonly dialogRef = inject(MatDialogRef<StaticValueEditDialogComponent>);
  readonly data: StaticValueEditDialogData = inject(MAT_DIALOG_DATA);
  private readonly fb = inject(FormBuilder);

  protected readonly typeOptions = staticValueTypeOptions;

  form = this.fb.group({
    id: [this.data.staticValue?.id ?? null],
    type: [this.data.staticValue?.type ?? StaticValueTypeEnum.INCOME_LIMIT, [Validators.required]],
    validFrom: [this.data.staticValue?.validFrom ?? '', [Validators.required]],
    validTo: [this.data.staticValue?.validTo ?? '', [Validators.required]],
    amount: [this.data.staticValue?.amount ?? null],
    countAdults: [this.data.staticValue?.countAdults ?? null],
    countChildren: [this.data.staticValue?.countChildren ?? null],
    age: [this.data.staticValue?.age ?? null]
  });

  save() {
    if (!this.form.valid) {
      this.form.markAllAsTouched();
    } else {
      this.dialogRef.close(this.form.value as StaticValueItem);
    }
  }

  cancel() {
    this.dialogRef.close();
  }
}
