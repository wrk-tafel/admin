import {Component, inject, signal} from '@angular/core';
import {MAT_DIALOG_DATA, MatDialogRef} from '@angular/material/dialog';
import {MatButtonModule} from '@angular/material/button';
import {MatCardModule} from '@angular/material/card';
import {MatPaginatorModule} from '@angular/material/paginator';
import {MatIcon} from '@angular/material/icon';
import {EmployeeApiService, EmployeeData, EmployeeListResponse} from '../../../../api/employee-api.service';
import {TafelDialogComponent} from '../../tafel-dialog/tafel-dialog.component';
import {PAGE_SIZE_OPTIONS} from '../../../api/paged-response';
import {registerSvgIcons} from '../../../util/svg-icon.util';
import touchAppIcon from '@material-symbols/svg-400/outlined/touch_app-fill.svg';

export interface SelectEmployeeDialogData {
  initialResponse: EmployeeListResponse;
  searchInput: string;
  testId: string;
}

@Component({
  selector: 'tafel-select-employee-dialog',
  imports: [
    TafelDialogComponent, MatButtonModule,
    MatCardModule, MatIcon, MatPaginatorModule
  ],
  templateUrl: 'select-employee-dialog.component.html',
})
export class SelectEmployeeDialogComponent {
  private readonly registerIcons = registerSvgIcons({touch_app: touchAppIcon});

  readonly dialogRef = inject(MatDialogRef<SelectEmployeeDialogComponent>);
  readonly data: SelectEmployeeDialogData = inject(MAT_DIALOG_DATA);
  private readonly employeeApiService = inject(EmployeeApiService);

  employeeSearchResponse = signal<EmployeeListResponse>(this.data.initialResponse);

  protected readonly pageSizeOptions = PAGE_SIZE_OPTIONS;

  triggerSearch(page: number, pageSize?: number) {
    this.employeeApiService.findEmployees(this.data.searchInput, page, pageSize).subscribe((response) => {
      this.employeeSearchResponse.set(response);
    });
  }

  selectEmployee(employee: EmployeeData) {
    this.dialogRef.close(employee);
  }
}
