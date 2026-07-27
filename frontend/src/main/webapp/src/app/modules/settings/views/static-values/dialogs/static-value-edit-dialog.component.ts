import {Component, inject} from '@angular/core';
import {MAT_DIALOG_DATA, MatDialogRef} from '@angular/material/dialog';
import {TafelDialogComponent} from '../../../../../common/components/tafel-dialog/tafel-dialog.component';
import {FormBuilder, ReactiveFormsModule} from '@angular/forms';
import {MatFormFieldModule} from '@angular/material/form-field';
import {MatInputModule} from '@angular/material/input';
import {MatButton} from '@angular/material/button';
import {StaticValueItem} from '../../../../../api/settings-api.service';
import {staticValueTypeLabels} from '../static-value-type-labels';

export interface StaticValueEditDialogData {
  staticValue: StaticValueItem;
}

@Component({
  selector: 'tafel-static-value-edit-dialog',
  templateUrl: 'static-value-edit-dialog.component.html',
  imports: [
    TafelDialogComponent,
    ReactiveFormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatButton
  ]
})
export class StaticValueEditDialogComponent {
  readonly dialogRef = inject(MatDialogRef<StaticValueEditDialogComponent>);
  readonly data: StaticValueEditDialogData = inject(MAT_DIALOG_DATA);
  private readonly fb = inject(FormBuilder);

  protected readonly typeLabel = staticValueTypeLabels[this.data.staticValue.type];

  // Only the amount may be changed - type/validFrom/validTo/countAdults/countChildren/age identify
  // which row a lookup matches, so they're shown for context but not editable.
  form = this.fb.group({
    amount: [this.data.staticValue.amount]
  });

  save() {
    this.dialogRef.close({
      ...this.data.staticValue,
      amount: this.form.value.amount
    } as StaticValueItem);
  }

  cancel() {
    this.dialogRef.close();
  }
}
