import {HttpTestingController, provideHttpClientTesting} from '@angular/common/http/testing';
import {TestBed} from '@angular/core/testing';
import {provideHttpClient, withXhr} from '@angular/common/http';
import {CreateEmployeeRequest, EmployeeApiService, EmployeeListResponse} from './employee-api.service';

describe('EmployeeApiService', () => {
  let httpMock: HttpTestingController;
  let apiService: EmployeeApiService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(withXhr()),
        provideHttpClientTesting(),
        EmployeeApiService
      ]
    });

    httpMock = TestBed.inject(HttpTestingController);
    apiService = TestBed.inject(EmployeeApiService);
  });

  it('fetch employees and map correctly', () => {
    const mockResponse: EmployeeListResponse = {
      items: [
        {id: 1, personnelNumber: '00001', firstname: 'first 1', lastname: 'last 1'},
        {id: 2, personnelNumber: '00002', firstname: 'first 2', lastname: 'last 2'},
      ],
      currentPage: 0,
      pageSize: 10,
      totalCount: 100,
      totalPages: 1
    };

    apiService.findEmployees().subscribe((data: EmployeeListResponse) => {
      expect(data).toEqual(mockResponse);
    });

    const req = httpMock.expectOne({method: 'GET', url: '/employees'});
    req.flush(mockResponse);
    httpMock.verify();
  });

  it('find employees with searchInput', () => {
    const searchInput = '000123';
    const page = 5;
    apiService.findEmployees(searchInput, page).subscribe();

    const req = httpMock.expectOne({method: 'GET', url: `/employees?searchInput=${searchInput}&page=${page}`});
    req.flush({items: []});
    httpMock.verify();
  });

  it('find employees sorted by a column', () => {
    apiService.findEmployees(undefined, 1, 10, 'lastname', 'asc').subscribe();

    const req = httpMock.expectOne({method: 'GET', url: '/employees?page=1&pageSize=10&sortBy=lastname&sortDirection=asc'});
    req.flush({items: []});
    httpMock.verify();
  });

  it('save employee', () => {
    const mockCreateEmployeeRequest: CreateEmployeeRequest = {
      personnelNumber: '00001',
      firstname: 'first 1',
      lastname: 'last 1'
    };
    apiService.saveEmployee(mockCreateEmployeeRequest).subscribe();

    const req = httpMock.expectOne({method: 'POST', url: '/employees'});
    req.flush(mockCreateEmployeeRequest);
    httpMock.verify();

    expect(req.request.body).toEqual(mockCreateEmployeeRequest);
  });

  it('update employee', () => {
    const mockUpdateEmployeeRequest: CreateEmployeeRequest = {
      personnelNumber: '00001',
      firstname: 'first 1',
      lastname: 'last 1'
    };
    apiService.updateEmployee(1, mockUpdateEmployeeRequest).subscribe();

    const req = httpMock.expectOne({method: 'PUT', url: '/employees/1'});
    req.flush(mockUpdateEmployeeRequest);
    httpMock.verify();

    expect(req.request.body).toEqual(mockUpdateEmployeeRequest);
  });

  it('delete employee', () => {
    apiService.deleteEmployee(1).subscribe();

    const req = httpMock.expectOne({method: 'DELETE', url: '/employees/1'});
    req.flush(null);
    httpMock.verify();
  });

});
