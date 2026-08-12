import {Component, computed, inject} from '@angular/core';
import {MAT_DIALOG_DATA, MatDialogRef} from '@angular/material/dialog';
import {TafelDialogComponent} from '../../../../../common/components/tafel-dialog/tafel-dialog.component';
import {FormBuilder, ReactiveFormsModule, Validators} from '@angular/forms';
import {CommonModule} from '@angular/common';
import {MatFormFieldModule} from '@angular/material/form-field';
import {MatInputModule} from '@angular/material/input';
import {MatButton} from '@angular/material/button';
import {toSignal} from '@angular/core/rxjs-interop';
import {CarData} from '../../../../../api/car-api.service';
import {normalizeLicensePlate} from '../license-plate';

export interface CarCreateDialogData {
  /** Every car there is, disabled ones included - that is what the duplicate check needs to see. */
  existingCars: CarData[];
}

/** Either a car to create, or the existing car the admin decided to re-enable instead. */
export type CarCreateDialogResult =
  { create: CarData; reactivate?: undefined } |
  { create?: undefined; reactivate: CarData };

@Component({
  selector: 'tafel-car-create-dialog',
  templateUrl: 'car-create-dialog.component.html',
  imports: [
    CommonModule,
    TafelDialogComponent,
    ReactiveFormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatButton
  ]
})
export class CarCreateDialogComponent {
  readonly dialogRef = inject(MatDialogRef<CarCreateDialogComponent, CarCreateDialogResult>);
  private readonly data = inject<CarCreateDialogData>(MAT_DIALOG_DATA);
  private readonly fb = inject(FormBuilder);

  form = this.fb.group({
    // The lengths are the `cars` table's own (varchar(20)/varchar(50)) - without them an
    // over-long value only fails once the database refuses it.
    licensePlate: ['', [Validators.required, Validators.maxLength(20)]],
    name: ['', [Validators.required, Validators.maxLength(50)]],
    // Not user-editable here - the backend auto-assigns the actual sort order on create,
    // placing new cars last; reordering afterwards happens via drag-and-drop.
    sortOrder: [0],
    enabled: [true]
  });

  private licensePlate = toSignal(this.form.controls.licensePlate.valueChanges, {initialValue: ''});

  /**
   * The car this plate already belongs to, if any. A disabled one is the case worth catching: it
   * is invisible in the Warenerfassung, so without this the admin creates a second record for a
   * vehicle that is already there instead of re-enabling it.
   */
  duplicate = computed(() => {
    const plate = normalizeLicensePlate(this.licensePlate() ?? '');
    if (!plate) {
      return undefined;
    }
    return this.data.existingCars.find(car => normalizeLicensePlate(car.licensePlate) === plate);
  });

  /** Uppercases while typing rather than on save, so what is stored is what the admin saw. */
  uppercaseLicensePlate() {
    const control = this.form.controls.licensePlate;
    const uppercased = (control.value ?? '').toUpperCase();
    if (uppercased !== control.value) {
      control.setValue(uppercased);
    }
  }

  save() {
    if (this.duplicate()) {
      return;
    }

    if (!this.form.valid) {
      this.form.markAllAsTouched();
    } else {
      const value = this.form.value;
      this.dialogRef.close({
        create: {
          ...value,
          licensePlate: normalizeLicensePlate(value.licensePlate ?? ''),
          name: (value.name ?? '').trim()
        } as CarData
      });
    }
  }

  reactivate() {
    const duplicate = this.duplicate();
    if (duplicate) {
      this.dialogRef.close({reactivate: duplicate});
    }
  }

  cancel() {
    this.dialogRef.close();
  }
}
