import {Component, inject, input, output} from '@angular/core';
import {MatButtonModule} from '@angular/material/button';
import {MatIcon} from '@angular/material/icon';
import {EmployeeApiService, EmployeeData} from '../../../api/employee-api.service';
import {MatDialog} from '@angular/material/dialog';
import {CreateEmployeeDialogComponent} from './dialogs/create-employee-dialog.component';
import {SelectEmployeeDialogComponent} from './dialogs/select-employee-dialog.component';
import {registerSvgIcons} from '../../util/svg-icon.util';
import searchIcon from '@material-symbols/svg-400/outlined/search-fill.svg';

@Component({
    selector: 'tafel-employee-search-create',
    templateUrl: 'tafel-employee-search-create.component.html',
    imports: [
        MatIcon,
        MatButtonModule,
    ]
})
export class TafelEmployeeSearchCreateComponent {
  private readonly registerIcons = registerSvgIcons({search: searchIcon});

  searchInput = input.required<string>();
  testIdPrefix = input<string>();
  selectedEmployee = output<EmployeeData>();

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
}
