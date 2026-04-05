import {Component, computed, inject, signal} from '@angular/core';
import {MAT_DIALOG_DATA, MatDialogRef} from '@angular/material/dialog';
import {
  ButtonDirective,
  CardBodyComponent,
  CardComponent,
} from '@coreui/angular';
import {FaIconComponent} from '@fortawesome/angular-fontawesome';
import {faHandPointer} from '@fortawesome/free-solid-svg-icons';
import {EmployeeApiService, EmployeeData, EmployeeListResponse} from '../../../../api/employee-api.service';
import {
  TafelPaginationComponent,
  TafelPaginationData
} from '../../../../common/components/tafel-pagination/tafel-pagination.component';
import {TafelDialogComponent} from '../../../../common/components/tafel-dialog/tafel-dialog.component';

export interface SelectEmployeeDialogData {
  initialResponse: EmployeeListResponse;
  searchInput: string;
  testId: string;
}

@Component({
  selector: 'tafel-select-employee-dialog',
  imports: [
    TafelDialogComponent, ButtonDirective,
    CardComponent, CardBodyComponent, FaIconComponent, TafelPaginationComponent
  ],
  templateUrl: './select-employee-dialog.component.html',
})
export class SelectEmployeeDialogComponent {
  readonly dialogRef = inject(MatDialogRef<SelectEmployeeDialogComponent>);
  readonly data: SelectEmployeeDialogData = inject(MAT_DIALOG_DATA);
  private readonly employeeApiService = inject(EmployeeApiService);

  employeeSearchResponse = signal<EmployeeListResponse>(this.data.initialResponse);
  paginationData = signal<TafelPaginationData>(null);

  protected readonly faHandPointer = faHandPointer;

  constructor() {
    this.updatePagination(this.data.initialResponse);
  }

  triggerSearch(page: number) {
    this.employeeApiService.findEmployees(this.data.searchInput, page).subscribe((response) => {
      this.employeeSearchResponse.set(response);
      this.updatePagination(response);
    });
  }

  selectEmployee(employee: EmployeeData) {
    this.dialogRef.close(employee);
  }

  private updatePagination(response: EmployeeListResponse) {
    this.paginationData.set({
      count: response.items.length,
      totalCount: response.totalCount,
      currentPage: response.currentPage,
      totalPages: response.totalPages,
      pageSize: response.pageSize
    });
  }
}
