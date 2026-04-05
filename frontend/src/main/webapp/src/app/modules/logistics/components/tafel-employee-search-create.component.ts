import {Component, inject, input, output} from '@angular/core';
import {ButtonDirective} from '@coreui/angular';
import {FaIconComponent} from '@fortawesome/angular-fontawesome';
import {faSearch} from '@fortawesome/free-solid-svg-icons';
import {EmployeeApiService, EmployeeData} from '../../../api/employee-api.service';
import {MatDialog} from '@angular/material/dialog';
import {CreateEmployeeDialogComponent} from './dialogs/create-employee-dialog.component';
import {SelectEmployeeDialogComponent} from './dialogs/select-employee-dialog.component';

@Component({
    selector: 'tafel-employee-search-create',
    templateUrl: 'tafel-employee-search-create.component.html',
    imports: [
        FaIconComponent,
        ButtonDirective,
    ]
})
export class TafelEmployeeSearchCreateComponent {
  searchInput = input.required<string>()
  testIdPrefix = input<string>()
  selectedEmployee = output<EmployeeData>()

  private readonly employeeApiService = inject(EmployeeApiService);
  private readonly dialog = inject(MatDialog);

  triggerSearch(page?: number) {
    this.employeeApiService.findEmployees(this.searchInput(), page)
      .subscribe((response) => {
        const employees = response.items;
        if (employees.length === 1) {
          this.selectedEmployee.emit(employees[0]);
        } else if (employees.length > 1) {
          this.dialog.open(SelectEmployeeDialogComponent, {
            data: {
              initialResponse: response,
              searchInput: this.searchInput(),
              testId: this.testIdPrefix() + '-select-employee-dialog',
              testIdPrefix: this.testIdPrefix() + '-'
            }
          }).afterClosed().subscribe(employee => {
            if (employee) {
              this.selectedEmployee.emit(employee);
            }
          });
        } else {
          this.dialog.open(CreateEmployeeDialogComponent, {
            data: {
              testId: this.testIdPrefix() + '-search-create-dialog',
              testIdPrefix: this.testIdPrefix() + '-'
            }
          }).afterClosed().subscribe(employee => {
            if (employee) {
              this.selectedEmployee.emit(employee);
            }
          });
        }
      });
  }

  protected readonly faSearch = faSearch;
}
