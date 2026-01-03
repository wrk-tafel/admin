import {Component, inject, input, OnDestroy, output} from '@angular/core';
import {FormBuilder, ReactiveFormsModule, Validators} from '@angular/forms';
import {
  BgColorDirective,
  ButtonCloseDirective,
  ButtonDirective,
  CardBodyComponent,
  CardComponent,
  ColComponent,
  InputGroupComponent,
  ModalModule,
  RowComponent
} from '@coreui/angular';
import {CommonModule} from '@angular/common';
import {FaIconComponent} from '@fortawesome/angular-fontawesome';
import {faHandPointer, faSearch} from '@fortawesome/free-solid-svg-icons';
import {EmployeeApiService, EmployeeData, EmployeeListResponse} from '../../../api/employee-api.service';
import {
  TafelPaginationComponent,
  TafelPaginationData
} from '../../../common/components/tafel-pagination/tafel-pagination.component';
import {Subject, takeUntil} from 'rxjs';

@Component({
  selector: 'tafel-employee-search-create',
  templateUrl: 'tafel-employee-search-create.component.html',
  imports: [
    ReactiveFormsModule,
    InputGroupComponent,
    CommonModule,
    FaIconComponent,
    ButtonDirective,
    ColComponent,
    RowComponent,
    BgColorDirective,
    ButtonCloseDirective,
    ModalModule,
    CardBodyComponent,
    CardComponent,
    TafelPaginationComponent,
  ],
  standalone: true
})
export class TafelEmployeeSearchCreateComponent implements OnDestroy {
  searchInput = input.required<string>()
  testIdPrefix = input<string>()
  selectedEmployee = output<EmployeeData>()

  private readonly employeeApiService = inject(EmployeeApiService);
  private readonly fb = inject(FormBuilder);
  private readonly destroy$ = new Subject<void>();

  createEmployeeForm = this.fb.group({
    personnelNumber: this.fb.control<string>(null, [Validators.required, Validators.maxLength(50)]),
    firstname: this.fb.control<string>(null, [Validators.required, Validators.maxLength(50)]),
    lastname: this.fb.control<string>(null, [Validators.required, Validators.maxLength(50)]),
  });

  showCreateEmployeeModal: boolean = false;

  paginationData: TafelPaginationData;
  employeeSearchResponse: EmployeeListResponse;
  showSelectEmployeeModal: boolean = false;

  triggerSearch(page?: number) {
    this.employeeApiService.findEmployees(this.searchInput(), page)
      .pipe(takeUntil(this.destroy$))
      .subscribe((response) => {
        this.employeeSearchResponse = null;
        this.paginationData = null;
        this.showCreateEmployeeModal = false;
        this.showSelectEmployeeModal = false;

        const employees = response.items;
        if (employees.length === 1) {
          this.selectedEmployee.emit(employees[0]);
        } else if (employees.length > 1) {
          this.employeeSearchResponse = response;
          this.paginationData = {
            count: response.items.length,
            totalCount: response.totalCount,
            currentPage: response.currentPage,
            totalPages: response.totalPages,
            pageSize: response.pageSize
          };
          this.showSelectEmployeeModal = true;
        } else {
          this.showCreateEmployeeModal = true;
        }
      });
  }

  selectEmployee(employee: EmployeeData) {
    this.employeeSearchResponse = undefined;
    this.selectedEmployee.emit(employee);
    this.showSelectEmployeeModal = false;
  }

  saveNewEmployee() {
    this.employeeApiService.saveEmployee(this.createEmployeeForm.getRawValue())
      .pipe(takeUntil(this.destroy$))
      .subscribe((savedEmployee) => {
        this.selectedEmployee.emit(savedEmployee);

        this.createEmployeeForm.reset();
        this.showCreateEmployeeModal = false;
      });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
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

  protected readonly faSearch = faSearch;
  protected readonly faHandPointer = faHandPointer;
}
