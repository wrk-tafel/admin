import {Component, inject} from '@angular/core';
import {MatDialogRef} from '@angular/material/dialog';
import {TafelDialogComponent} from '../../../../../common/components/tafel-dialog/tafel-dialog.component';
import {FormBuilder, ReactiveFormsModule, Validators} from '@angular/forms';
import {CommonModule} from '@angular/common';
import {MatFormFieldModule} from '@angular/material/form-field';
import {MatInputModule} from '@angular/material/input';
import {MatButton} from '@angular/material/button';
import {CreateEmployeeRequest} from '../../../../../api/employee-api.service';

@Component({
  selector: 'tafel-employee-create-dialog',
  templateUrl: 'employee-create-dialog.component.html',
  imports: [
    CommonModule,
    TafelDialogComponent,
    ReactiveFormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatButton
  ]
})
export class EmployeeCreateDialogComponent {
  readonly dialogRef = inject(MatDialogRef<EmployeeCreateDialogComponent>);
  private readonly fb = inject(FormBuilder);

  form = this.fb.group({
    personnelNumber: ['', [Validators.required, Validators.maxLength(50)]],
    firstname: ['', [Validators.required, Validators.maxLength(50)]],
    lastname: ['', [Validators.required, Validators.maxLength(50)]],
  });

  save() {
    if (!this.form.valid) {
      this.form.markAllAsTouched();
    } else {
      this.dialogRef.close(this.form.value as CreateEmployeeRequest);
    }
  }

  cancel() {
    this.dialogRef.close();
  }

  get personnelNumber() {
    return this.form.get('personnelNumber')!;
  }

  get firstname() {
    return this.form.get('firstname')!;
  }

  get lastname() {
    return this.form.get('lastname')!;
  }
}
