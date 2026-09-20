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

  // The backend rejects a blank name or one over 50 characters (@NotBlank, @Size(max=50)); matched
  // here so an invalid value never becomes a bare "Erstellen fehlgeschlagen" toast with the dialog
  // already gone.
  form = this.fb.group({
    name: ['', [Validators.required, Validators.maxLength(50)]],
    enabled: [true]
  });

  save() {
    // trimmed before validating, not after - otherwise a whitespace-only name would pass `required`
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
