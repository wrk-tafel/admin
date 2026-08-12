import {Component, inject, signal} from '@angular/core';
import {takeUntilDestroyed} from '@angular/core/rxjs-interop';
import {MatDialogRef} from '@angular/material/dialog';
import {TafelDialogComponent} from '../../../../../common/components/tafel-dialog/tafel-dialog.component';
import {FormBuilder, ReactiveFormsModule, ValidationErrors, Validators} from '@angular/forms';
import {CommonModule} from '@angular/common';
import {MatFormFieldModule} from '@angular/material/form-field';
import {MatInputModule} from '@angular/material/input';
import {MatButton} from '@angular/material/button';
import {catchError, debounceTime, distinctUntilChanged, map, of, switchMap} from 'rxjs';
import {
  CreateEmployeeRequest,
  EmployeeApiService,
  EmployeeData,
  PersonnelNumberAvailabilityResponse
} from '../../../../../api/employee-api.service';

/** Long enough not to ask on every keystroke of a personnel number, short enough to answer while typing. */
const PERSONNEL_NUMBER_CHECK_DEBOUNCE_MS = 400;

/** What an empty field and an unanswerable check both count as: nothing to warn about. */
const AVAILABLE: PersonnelNumberAvailabilityResponse = {available: true};

/**
 * Either the employee to create, or the one already holding the personnel number that was typed -
 * a collision is answered by opening that record rather than by picking another number blindly.
 */
export type EmployeeCreateDialogResult =
  | { type: 'create', employee: CreateEmployeeRequest }
  | { type: 'openExisting', employee: EmployeeData };

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
  private readonly employeeApiService = inject(EmployeeApiService);

  /** The employee already holding the typed personnel number, as far as the last check knows. */
  protected readonly duplicate = signal<EmployeeData | null>(null);

  private readonly duplicateValidator = (): ValidationErrors | null => this.duplicate() ? {duplicateEmployee: true} : null;

  form = this.fb.group({
    personnelNumber: ['', [Validators.required, Validators.maxLength(50), this.duplicateValidator]],
    firstname: ['', [Validators.required, Validators.maxLength(50)]],
    lastname: ['', [Validators.required, Validators.maxLength(50)]],
  });

  constructor() {
    this.personnelNumber.valueChanges
      .pipe(
        debounceTime(PERSONNEL_NUMBER_CHECK_DEBOUNCE_MS),
        map(value => (value ?? '').trim()),
        distinctUntilChanged(),
        switchMap(personnelNumber => personnelNumber
          // A failed check must not block a save the backend would accept - it stays the authority
          // on the collision, and answers with one when the number really is taken.
          ? this.employeeApiService.checkPersonnelNumberAvailability(personnelNumber).pipe(catchError(() => of(AVAILABLE)))
          : of(AVAILABLE)),
        takeUntilDestroyed()
      )
      .subscribe(response => {
        this.duplicate.set(response.available ? null : response.existingEmployee ?? null);
        if (this.duplicate()) {
          // The collision is worth showing while the number is still being typed, and Material
          // only renders an error once the field counts as touched.
          this.personnelNumber.markAsTouched();
        }
        this.personnelNumber.updateValueAndValidity({emitEvent: false});
      });
  }

  save() {
    if (!this.form.valid) {
      this.form.markAllAsTouched();
    } else {
      this.dialogRef.close({type: 'create', employee: this.form.value as CreateEmployeeRequest} satisfies EmployeeCreateDialogResult);
    }
  }

  protected openDuplicate(employee: EmployeeData) {
    this.dialogRef.close({type: 'openExisting', employee} satisfies EmployeeCreateDialogResult);
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
