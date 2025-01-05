import {HttpTestingController, provideHttpClientTesting} from '@angular/common/http/testing';
import {TestBed} from '@angular/core/testing';
import {provideHttpClient} from '@angular/common/http';
import {CreateEmployeeRequest, EmployeeApiService, EmployeeData} from './employee-api.service';

describe('EmployeeApiService', () => {
  let httpMock: HttpTestingController;
  let apiService: EmployeeApiService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        EmployeeApiService
      ]
    });

    httpMock = TestBed.inject(HttpTestingController);
    apiService = TestBed.inject(EmployeeApiService);
  });

  it('fetch employees and map correctly', () => {
    const mockEmployees = [
      {id: 1, personnelNumber: '00001', firstname: 'first 1', lastname: 'last 1'},
      {id: 2, personnelNumber: '00002', firstname: 'first 2', lastname: 'last 2'},
    ];

    apiService.getEmployees().subscribe((data: EmployeeData[]) => {
      expect(data).toEqual(mockEmployees);
    });

    const req = httpMock.expectOne({method: 'GET', url: '/employees'});
    req.flush({items: mockEmployees});
    httpMock.verify();
  });

  it('fetch employees with personnelNumber', () => {
    const personnelNumber = "000123"
    apiService.getEmployees(personnelNumber).subscribe();

    const req = httpMock.expectOne({method: 'GET', url: `/employees?personnelNumber=${personnelNumber}`});
    req.flush({items: []});
    httpMock.verify();
  });

  it('save employee', () => {
    const mockCreateEmployeeRequest: CreateEmployeeRequest = {
      personnelNumber: '00001',
      firstname: 'first 1',
      lastname: 'last 1'
    }
    apiService.saveEmployee(mockCreateEmployeeRequest).subscribe();

    const req = httpMock.expectOne({method: 'POST', url: '/employees'});
    req.flush(mockCreateEmployeeRequest);
    httpMock.verify();

    expect(req.request.body).toEqual(mockCreateEmployeeRequest);
  });

});
