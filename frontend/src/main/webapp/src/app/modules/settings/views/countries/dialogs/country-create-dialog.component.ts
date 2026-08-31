import {Component, inject} from '@angular/core';
import {MatDialogRef} from '@angular/material/dialog';
import {TafelDialogComponent} from '../../../../../common/components/tafel-dialog/tafel-dialog.component';
import {FormBuilder, ReactiveFormsModule, Validators} from '@angular/forms';
import {CommonModule} from '@angular/common';
import {MatFormFieldModule} from '@angular/material/form-field';
import {MatInputModule} from '@angular/material/input';
import {MatButton} from '@angular/material/button';
import {CountryCreateData} from '../../../../../api/country-api.service';

@Component({
  selector: 'tafel-country-create-dialog',
  templateUrl: 'country-create-dialog.component.html',
  imports: [
    CommonModule,
    TafelDialogComponent,
    ReactiveFormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatButton
  ]
})
export class CountryCreateDialogComponent {
  readonly dialogRef = inject(MatDialogRef<CountryCreateDialogComponent>);
  private readonly fb = inject(FormBuilder);

  // The backend rejects anything but a 2-letter code (@Size(min=2, max=2)); matched here so an
  // invalid value never becomes a bare "Erstellen fehlgeschlagen" toast with the dialog already gone.
  form = this.fb.group({
    code: ['', [Validators.required, Validators.pattern(/^[A-Za-z]{2}$/)]],
    name: ['', [Validators.required]],
    enabled: [true]
  });

  save() {
    // trimmed/uppercased before validating, not after - otherwise surrounding whitespace (e.g. a
    // pasted " zz ") fails the exactly-two-letters pattern and save() silently no-ops
    const trimmedCode = (this.form.controls.code.value ?? '').trim().toUpperCase();
    this.form.controls.code.setValue(trimmedCode);
    this.form.controls.name.setValue((this.form.controls.name.value ?? '').trim());

    if (!this.form.valid) {
      this.form.markAllAsTouched();
    } else {
      this.dialogRef.close(this.form.value as CountryCreateData);
    }
  }

  cancel() {
    this.dialogRef.close();
  }
}
