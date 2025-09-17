import {TestBed} from '@angular/core/testing';
import {provideHttpClient} from '@angular/common/http';
import {provideHttpClientTesting} from '@angular/common/http/testing';
import {
  CreateEmployeeRequest,
  EmployeeApiService,
  EmployeeData,
  EmployeeListResponse
} from '../../../api/employee-api.service';
import {TafelEmployeeSearchCreateComponent} from './tafel-employee-search-create.component';
import {of} from 'rxjs';
import {provideZonelessChangeDetection} from "@angular/core";
import {provideNoopAnimations} from "@angular/platform-browser/animations";

describe('TafelEmployeeSearchCreate', () => {
  let employeeApiService: jasmine.SpyObj<EmployeeApiService>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideNoopAnimations(),
        provideZonelessChangeDetection(),
        provideHttpClient(),
        provideHttpClientTesting(),
        {
          provide: EmployeeApiService,
          useValue: jasmine.createSpyObj('EmployeeApiService', ['findEmployees', 'saveEmployee'])
        }
      ]
    }).compileComponents();

    employeeApiService = TestBed.inject(EmployeeApiService) as jasmine.SpyObj<EmployeeApiService>;
  });

  const mockEmployeeResponse: EmployeeListResponse = {
    items: [
      {id: 1, personnelNumber: '00001', firstname: 'first 1', lastname: 'last 1'},
      {id: 2, personnelNumber: '00002', firstname: 'first 2', lastname: 'last 2'},
    ],
    totalPages: 1,
    totalCount: 2,
    pageSize: 1,
    currentPage: 1
  };

  it('component can be created', () => {
    const fixture = TestBed.createComponent(TafelEmployeeSearchCreateComponent);
    const component = fixture.componentInstance;
    expect(component).toBeTruthy();
  });

  it('single employee found', () => {
    const fixture = TestBed.createComponent(TafelEmployeeSearchCreateComponent);
    const component = fixture.componentInstance;
    const componentRef = fixture.componentRef;
    const personnelNumber = '00001'
    componentRef.setInput('searchInput', personnelNumber);

    const mockResponse = {
      ...mockEmployeeResponse,
      items: [mockEmployeeResponse.items[0]]
    };
    employeeApiService.findEmployees.and.returnValues(of(mockResponse));

    let emittedEmployee: EmployeeData;
    component.selectedEmployee.subscribe((employee) => {
      emittedEmployee = employee;
    });

    component.triggerSearch();

    expect(emittedEmployee).toEqual(mockEmployeeResponse.items[0]);
  });

  it('multiple employees found', () => {
    const fixture = TestBed.createComponent(TafelEmployeeSearchCreateComponent);
    const component = fixture.componentInstance;
    const componentRef = fixture.componentRef;
    const personnelNumber = '00001'
    componentRef.setInput('searchInput', personnelNumber);

    employeeApiService.findEmployees.and.returnValues(of(mockEmployeeResponse));

    let emitted = false;
    component.selectedEmployee.subscribe((employee) => {
      emitted = true;
    });

    component.triggerSearch();

    expect(component.showSelectEmployeeModal).toBeTrue();
    expect(component.showCreateEmployeeModal).toBeFalse();
    expect(emitted).toBeFalse();
  });

  it('employee not found', () => {
    const fixture = TestBed.createComponent(TafelEmployeeSearchCreateComponent);
    const component = fixture.componentInstance;
    const componentRef = fixture.componentRef;
    const personnelNumber = '00001'
    componentRef.setInput('searchInput', personnelNumber);

    const emptyResponse: EmployeeListResponse = {
      items: [],
      currentPage: 1,
      pageSize: 1,
      totalCount: 1,
      totalPages: 1
    };
    employeeApiService.findEmployees.and.returnValues(of(emptyResponse));

    let emitted = false;
    component.selectedEmployee.subscribe((employee) => {
      emitted = true;
    });

    component.triggerSearch();

    expect(component.showCreateEmployeeModal).toBeTrue();
    expect(component.showSelectEmployeeModal).toBeFalse();
    expect(emitted).toBeFalse();
  });

  it('selected employee', () => {
    const fixture = TestBed.createComponent(TafelEmployeeSearchCreateComponent);
    const component = fixture.componentInstance;
    component.showSelectEmployeeModal = true;

    const mockEmployee: EmployeeData = {id: 1, personnelNumber: '00001', firstname: 'first 1', lastname: 'last 1'};

    let emittedEmployee: EmployeeData;
    component.selectedEmployee.subscribe((employee) => {
      emittedEmployee = employee;
    });

    component.selectEmployee(mockEmployee)

    expect(component.showSelectEmployeeModal).toBeFalse();
    expect(emittedEmployee).toEqual(mockEmployee);
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
