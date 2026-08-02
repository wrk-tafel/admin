import {Component, effect, ElementRef, inject, signal, viewChild} from '@angular/core';
import {MatDialog} from '@angular/material/dialog';
import {EmployeeCreateDialogComponent} from './dialogs/employee-create-dialog.component';
import {FormControl, ReactiveFormsModule} from '@angular/forms';
import {MatCard, MatCardContent, MatCardHeader, MatCardTitle} from '@angular/material/card';
import {
  MatCell,
  MatCellDef,
  MatColumnDef,
  MatHeaderCell,
  MatHeaderCellDef,
  MatHeaderRow,
  MatHeaderRowDef,
  MatRow,
  MatRowDef,
  MatTable
} from '@angular/material/table';
import {MatPaginatorModule} from '@angular/material/paginator';
import {CreateEmployeeRequest, EmployeeApiService, EmployeeData, EmployeeListResponse} from '../../../../api/employee-api.service';
import {FaIconComponent} from '@fortawesome/angular-fontawesome';
import {MatButton} from '@angular/material/button';
import {faCheck, faMagnifyingGlass, faPencil, faPlus, faXmark} from '@fortawesome/free-solid-svg-icons';
import {TafelToastrService} from '../../../../common/components/tafel-toastr/tafel-toastr.service';
import {MatFormFieldModule} from '@angular/material/form-field';
import {MatInputModule} from '@angular/material/input';

@Component({
  selector: 'tafel-settings-employees',
  templateUrl: 'settings-employees.component.html',
  imports: [
    MatCard,
    MatCardContent,
    MatCardHeader,
    MatCardTitle,
    MatCell,
    MatCellDef,
    MatColumnDef,
    MatHeaderCell,
    MatHeaderRow,
    MatHeaderRowDef,
    MatRow,
    MatRowDef,
    MatTable,
    MatHeaderCellDef,
    MatPaginatorModule,
    FaIconComponent,
    MatButton,
    ReactiveFormsModule,
    MatFormFieldModule,
    MatInputModule,
  ]
})
export class SettingsEmployeesComponent {
  private readonly employeeApiService = inject(EmployeeApiService);
  private readonly toastr = inject(TafelToastrService);
  private readonly dialog = inject(MatDialog);

  private _employees = signal<EmployeeListResponse | null>(null);
  protected employees = this._employees;
  displayedColumns = ['personnelNumber', 'firstname', 'lastname', 'actions'];

  protected searchControl = new FormControl<string>('', {nonNullable: true});

  protected editingId = signal<number | null>(null);
  protected personnelNumberControl = new FormControl<string>('', {nonNullable: true});
  protected firstnameControl = new FormControl<string>('', {nonNullable: true});
  protected lastnameControl = new FormControl<string>('', {nonNullable: true});
  private personnelNumberInput = viewChild<ElementRef<HTMLInputElement>>('personnelNumberInput');

  constructor() {
    this.loadEmployees();

    effect(() => this.personnelNumberInput()?.nativeElement.focus());
  }

  protected search() {
    this.loadEmployees(1);
  }

  protected loadEmployees(page?: number) {
    this.employeeApiService.findEmployees(this.searchControl.value || undefined, page).subscribe({
      next: data => this._employees.set(data),
      error: () => this.toastr.error('Fehler beim Laden der Mitarbeiter', 'Fehler')
    });
  }

  protected startEdit(employee: EmployeeData) {
    this.editingId.set(employee.id);
    this.personnelNumberControl.setValue(employee.personnelNumber);
    this.firstnameControl.setValue(employee.firstname);
    this.lastnameControl.setValue(employee.lastname);
  }

  protected cancelEdit() {
    this.editingId.set(null);
  }

  protected saveEdit(employee: EmployeeData) {
    const updated: CreateEmployeeRequest = {
      personnelNumber: this.personnelNumberControl.value,
      firstname: this.firstnameControl.value,
      lastname: this.lastnameControl.value
    };

    this.employeeApiService.updateEmployee(employee.id, updated).subscribe({
      next: () => {
        this.toastr.success('Mitarbeiter gespeichert', 'Erfolgreich');
        this.editingId.set(null);
        this.loadEmployees(this.employees()?.currentPage);
      },
      error: () => this.toastr.error('Speichern fehlgeschlagen', 'Fehler')
    });
  }

  protected addEmployee() {
    const dialogRef = this.dialog.open(EmployeeCreateDialogComponent, {
      width: '600px'
    });

    dialogRef.afterClosed().subscribe((created: CreateEmployeeRequest | undefined) => {
      if (created) {
        this.employeeApiService.saveEmployee(created).subscribe({
          next: () => {
            this.toastr.success('Mitarbeiter erstellt', 'Erfolgreich');
            this.loadEmployees(this.employees()?.currentPage);
          },
          error: () => this.toastr.error('Erstellen fehlgeschlagen', 'Fehler')
        });
      }
    });
  }

  protected readonly faPencil = faPencil;
  protected readonly faPlus = faPlus;
  protected readonly faCheck = faCheck;
  protected readonly faXmark = faXmark;
  protected readonly faMagnifyingGlass = faMagnifyingGlass;
}
