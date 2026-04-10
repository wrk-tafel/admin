import {Component, inject} from '@angular/core';
import {MAT_DIALOG_DATA, MatDialogRef} from '@angular/material/dialog';
import {ButtonDirective, InputGroupComponent} from '@coreui/angular';
import {FormBuilder, ReactiveFormsModule, Validators} from '@angular/forms';
import {CommonModule} from '@angular/common';
import {EmployeeApiService, EmployeeData} from '../../../../api/employee-api.service';
import {ToastrService} from 'ngx-toastr';
import {TafelDialogComponent} from '../../../../common/components/tafel-dialog/tafel-dialog.component';

export interface CreateEmployeeDialogData {
  testId: string;
  testIdPrefix: string;
}

@Component({
  selector: 'tafel-create-employee-dialog',
  imports: [TafelDialogComponent, ButtonDirective, ReactiveFormsModule, CommonModule, InputGroupComponent],
  templateUrl: 'create-employee-dialog.component.html',
})
export class CreateEmployeeDialogComponent {
  readonly dialogRef = inject(MatDialogRef<CreateEmployeeDialogComponent>);
  readonly data: CreateEmployeeDialogData = inject(MAT_DIALOG_DATA);
  private readonly employeeApiService = inject(EmployeeApiService);
  private readonly toastr = inject(ToastrService);
  private readonly fb = inject(FormBuilder);

  createEmployeeForm = this.fb.group({
    personnelNumber: this.fb.control<string>(null, [Validators.required, Validators.maxLength(50)]),
    firstname: this.fb.control<string>(null, [Validators.required, Validators.maxLength(50)]),
    lastname: this.fb.control<string>(null, [Validators.required, Validators.maxLength(50)]),
  });

  saveNewEmployee() {
    this.employeeApiService.saveEmployee(this.createEmployeeForm.getRawValue())
      .subscribe({
        next: (savedEmployee: EmployeeData) => {
          this.dialogRef.close(savedEmployee);
        },
        error: () => {
          this.toastr.error('Fehler beim Speichern des Mitarbeiters');
        }
      });
  }

  get personnelNumber() {
    return this.createEmployeeForm.get('personnelNumber');
  }

  get firstname() {
    return this.createEmployeeForm.get('firstname');
  }

  get lastname() {
    return this.createEmployeeForm.get('lastname');
  }
}
