import {TestBed, waitForAsync} from '@angular/core/testing';
import {provideHttpClient} from '@angular/common/http';
import {provideHttpClientTesting} from '@angular/common/http/testing';
import {CreateEmployeeRequest, EmployeeApiService, EmployeeData} from '../../../api/employee-api.service';
import {TafelEmployeeSearchCreateComponent} from './tafel-employee-search-create.component';
import {NoopAnimationsModule} from '@angular/platform-browser/animations';
import {of} from 'rxjs';

describe('TafelEmployeeSearchCreate', () => {
  let employeeApiService: jasmine.SpyObj<EmployeeApiService>;

  beforeEach(waitForAsync(() => {
    TestBed.configureTestingModule({
      imports: [
        NoopAnimationsModule
      ],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        {
          provide: EmployeeApiService,
          useValue: jasmine.createSpyObj('EmployeeApiService', ['getEmployees', 'saveEmployee'])
        }
      ]
    }).compileComponents();

    employeeApiService = TestBed.inject(EmployeeApiService) as jasmine.SpyObj<EmployeeApiService>;
  }));

  it('component can be created', () => {
    const fixture = TestBed.createComponent(TafelEmployeeSearchCreateComponent);
    const component = fixture.componentInstance;
    expect(component).toBeTruthy();
  });

  it('searchInput prefilled as personnelNumber', () => {
    const fixture = TestBed.createComponent(TafelEmployeeSearchCreateComponent);
    const component = fixture.componentInstance;
    const componentRef = fixture.componentRef;
    const personnelNumber = '00001'
    componentRef.setInput('searchInput', personnelNumber);
    fixture.detectChanges();

    expect(component.personnelNumber.getRawValue()).toEqual(personnelNumber);
  });

  it('employee found', () => {
    const fixture = TestBed.createComponent(TafelEmployeeSearchCreateComponent);
    const component = fixture.componentInstance;
    const componentRef = fixture.componentRef;
    const personnelNumber = '00001'
    componentRef.setInput('searchInput', personnelNumber);

    const mockEmployees = [
      {id: 1, personnelNumber: '00001', firstname: 'first 1', lastname: 'last 1'}
    ];
    employeeApiService.getEmployees.and.returnValues(of(mockEmployees));

    let emittedEmployee: EmployeeData;
    component.selectedEmployee.subscribe((employee) => {
      emittedEmployee = employee;
    });

    component.triggerSearch();

    expect(emittedEmployee).toEqual(mockEmployees[0]);
  });

  it('employee not found', () => {
    const fixture = TestBed.createComponent(TafelEmployeeSearchCreateComponent);
    const component = fixture.componentInstance;
    const componentRef = fixture.componentRef;
    const personnelNumber = '00001'
    componentRef.setInput('searchInput', personnelNumber);

    employeeApiService.getEmployees.and.returnValues(of([]));

    let emitted = false;
    component.selectedEmployee.subscribe((employee) => {
      emitted = true;
    });

    component.triggerSearch();

    expect(component.showCreateEmployeeModal).toBeTrue();
    expect(emitted).toBeFalse();
  });

  it('save new employee', () => {
    const fixture = TestBed.createComponent(TafelEmployeeSearchCreateComponent);
    const component = fixture.componentInstance;

    const mockCreateEmployeeRequest: CreateEmployeeRequest = {
      personnelNumber: '00001',
      firstname: 'first 1',
      lastname: 'last 1'
    };
    const mockEmployee: EmployeeData = {id: 1, personnelNumber: '00001', firstname: 'first 1', lastname: 'last 1'};
    employeeApiService.saveEmployee.and.returnValues(of(mockEmployee));

    component.personnelNumber.setValue(mockEmployee.personnelNumber);
    component.firstname.setValue(mockEmployee.firstname);
    component.lastname.setValue(mockEmployee.lastname);
    component.showCreateEmployeeModal = true;

    let emittedEmployee: EmployeeData;
    component.selectedEmployee.subscribe((employee) => {
      emittedEmployee = employee;
    });

    component.saveNewEmployee();

    expect(employeeApiService.saveEmployee).toHaveBeenCalledWith(mockCreateEmployeeRequest);
    expect(emittedEmployee).toEqual(mockEmployee);
    expect(component.showCreateEmployeeModal).toBeFalse();
  });

});
