import {HttpTestingController, provideHttpClientTesting} from '@angular/common/http/testing';
import {TestBed} from '@angular/core/testing';
import {provideHttpClient} from '@angular/common/http';
import {CreateEmployeeRequest, EmployeeApiService, EmployeeListResponse} from './employee-api.service';
import {provideZonelessChangeDetection} from "@angular/core";

describe('EmployeeApiService', () => {
  let httpMock: HttpTestingController;
  let apiService: EmployeeApiService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideZonelessChangeDetection(),
        provideHttpClient(),
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
    const searchInput = '000123'
    const page = 5;
    apiService.findEmployees(searchInput, page).subscribe();

    const req = httpMock.expectOne({method: 'GET', url: `/employees?searchInput=${searchInput}&page=${page}`});
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
