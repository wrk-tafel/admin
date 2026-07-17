import {Component, inject, signal} from '@angular/core';
import {MAT_DIALOG_DATA, MatDialogRef} from '@angular/material/dialog';
import {MatButtonModule} from '@angular/material/button';
import {MatCardModule} from '@angular/material/card';
import {MatPaginatorModule} from '@angular/material/paginator';
import {FaIconComponent} from '@fortawesome/angular-fontawesome';
import {faHandPointer} from '@fortawesome/free-solid-svg-icons';
import {EmployeeApiService, EmployeeData, EmployeeListResponse} from '../../../../api/employee-api.service';
import {TafelDialogComponent} from '../../../../common/components/tafel-dialog/tafel-dialog.component';

export interface SelectEmployeeDialogData {
  initialResponse: EmployeeListResponse;
  searchInput: string;
  testId: string;
}

@Component({
  selector: 'tafel-select-employee-dialog',
  imports: [
    TafelDialogComponent, MatButtonModule,
    MatCardModule, FaIconComponent, MatPaginatorModule
  ],
  templateUrl: 'select-employee-dialog.component.html',
})
export class SelectEmployeeDialogComponent {
  readonly dialogRef = inject(MatDialogRef<SelectEmployeeDialogComponent>);
  readonly data: SelectEmployeeDialogData = inject(MAT_DIALOG_DATA);
  private readonly employeeApiService = inject(EmployeeApiService);

  employeeSearchResponse = signal<EmployeeListResponse>(this.data.initialResponse);

  protected readonly faHandPointer = faHandPointer;

  triggerSearch(page: number) {
    this.employeeApiService.findEmployees(this.data.searchInput, page).subscribe((response) => {
      this.employeeSearchResponse.set(response);
    });
  }

  selectEmployee(employee: EmployeeData) {
    this.dialogRef.close(employee);
  }
}
