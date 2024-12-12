import {Component, effect, inject, input, output} from '@angular/core';
import {FormBuilder, ReactiveFormsModule, Validators} from '@angular/forms';
import {
  BgColorDirective,
  ButtonCloseDirective,
  ButtonDirective,
  ColComponent,
  InputGroupComponent,
  ModalModule,
  RowComponent
} from '@coreui/angular';
import {CommonModule} from '@angular/common';
import {FaIconComponent} from '@fortawesome/angular-fontawesome';
import {faSearch} from '@fortawesome/free-solid-svg-icons';
import {EmployeeApiService, EmployeeData} from '../../../api/employee-api.service';

@Component({
  selector: 'tafel-employee-search-create',
  templateUrl: 'tafel-employee-search-create.component.html',
  standalone: true,
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
  ]
})
export class TafelEmployeeSearchCreateComponent {
  searchInput = input.required<string>()
  testId = input<string>()
  buttonDisabled = input<boolean>()
  selectedEmployee = output<EmployeeData>()

  private readonly employeeApiService = inject(EmployeeApiService);
  private readonly fb = inject(FormBuilder);

  form = this.fb.group({
    personnelNumber: this.fb.control<string>(null, [Validators.required, Validators.maxLength(50)]),
    firstname: this.fb.control<string>(null, [Validators.required, Validators.maxLength(50)]),
    lastname: this.fb.control<string>(null, [Validators.required, Validators.maxLength(50)]),
  });

  showCreateEmployeeModal: boolean = false;

  searchInputEffect = effect(() => {
    const searchInput = this.searchInput();
    this.personnelNumber.setValue(searchInput);
  });

  triggerSearch() {
    this.employeeApiService.getEmployees(this.searchInput()).subscribe((employees) => {
      if (employees.length === 0) {
        this.showCreateEmployeeModal = true;
      } else {
        this.selectedEmployee.emit(employees[0]);
      }
    });
  }

  saveNewEmployee() {
    this.employeeApiService.saveEmployee(this.form.getRawValue()).subscribe((savedEmployee) => {
      this.selectedEmployee.emit(savedEmployee);

      this.form.reset();
      this.showCreateEmployeeModal = false;
    });
  }

  get personnelNumber() {
    return this.form.get('personnelNumber');
  }

  get firstname() {
    return this.form.get('firstname');
  }

  get lastname() {
    return this.form.get('lastname');
  }

  protected readonly faSearch = faSearch;
}
