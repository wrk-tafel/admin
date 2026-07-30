import {Component, inject} from '@angular/core';
import {MAT_DIALOG_DATA, MatDialogRef} from '@angular/material/dialog';
import {TafelDialogComponent} from '../../../../../common/components/tafel-dialog/tafel-dialog.component';
import {FormBuilder, ReactiveFormsModule, Validators} from '@angular/forms';
import {CommonModule} from '@angular/common';
import {MatFormFieldModule} from '@angular/material/form-field';
import {MatInputModule} from '@angular/material/input';
import {MatCheckboxModule} from '@angular/material/checkbox';
import {MatButton} from '@angular/material/button';
import {CarData} from '../../../../../api/car-api.service';

export interface CarEditDialogData {
  car: CarData;
}

@Component({
  selector: 'tafel-car-edit-dialog',
  templateUrl: 'car-edit-dialog.component.html',
  imports: [
    CommonModule,
    TafelDialogComponent,
    ReactiveFormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatCheckboxModule,
    MatButton
  ]
})
export class CarEditDialogComponent {
  readonly dialogRef = inject(MatDialogRef<CarEditDialogComponent>);
  readonly data: CarEditDialogData = inject(MAT_DIALOG_DATA);
  private readonly fb = inject(FormBuilder);

  form = this.fb.group({
    id: [this.data.car?.id, []],
    licensePlate: [this.data.car?.licensePlate ?? '', [Validators.required]],
    name: [this.data.car?.name ?? '', [Validators.required]],
    enabled: [this.data.car?.enabled ?? true],
    // Not user-editable here - preserved as-is on edit, auto-assigned by the backend on
    // create; reordering afterwards happens via drag-and-drop.
    sortOrder: [this.data.car?.sortOrder ?? 0]
  });

  save() {
    if (!this.form.valid) {
      this.form.markAllAsTouched();
    } else {
      this.dialogRef.close(this.form.value as CarData);
    }
  }

  cancel() {
    this.dialogRef.close();
  }
}
