import {Component, effect, inject, input, output} from '@angular/core';
import {FormControl, FormGroup, ReactiveFormsModule, Validators} from '@angular/forms';
import {
  BgColorDirective,
  ButtonCloseDirective,
  ButtonDirective,
  ColComponent,
  FormSelectDirective,
  InputGroupComponent,
  InputGroupTextDirective,
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
  imports: [
    ReactiveFormsModule,
    InputGroupComponent,
    CommonModule,
    FaIconComponent,
    ButtonDirective,
    ColComponent,
    FormSelectDirective,
    InputGroupTextDirective,
    RowComponent,
    BgColorDirective,
    ButtonCloseDirective,
    ModalModule,
  ],
  standalone: true
})
export class TafelEmployeeSearchCreateComponent {
  searchInput = input.required<string>()
  testId = input<string>()
  buttonDisabled = input<boolean>()
  selectedEmployee = output<EmployeeData>()

  employeeApiService = inject(EmployeeApiService);
  showCreateEmployeeModal: boolean = false;

  form = new FormGroup({
    personnelNumber: new FormControl<string>(null, [Validators.required, Validators.maxLength(50)]),
    firstname: new FormControl<string>(null, [Validators.required, Validators.maxLength(50)]),
    lastname: new FormControl<string>(null, [Validators.required, Validators.maxLength(50)]),
  });

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
