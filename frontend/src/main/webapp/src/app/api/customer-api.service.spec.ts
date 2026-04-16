import {HttpTestingController, provideHttpClientTesting} from '@angular/common/http/testing';
import {TestBed} from '@angular/core/testing';
import moment from 'moment';
import {CustomerApiService, CustomerMergeRequest, Gender, CustomerData} from './customer-api.service';
import {ReactiveFormsModule} from '@angular/forms';
import {provideHttpClient} from '@angular/common/http';
import {ToastrService} from 'ngx-toastr';
import type {MockedObject} from 'vitest';
import {AuthenticationService} from '../common/security/authentication.service';

describe('CustomerApiService', () => {
  let httpMock: HttpTestingController;
  let apiService: CustomerApiService;
  let toastrServiceSpy: MockedObject<ToastrService>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [ReactiveFormsModule],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        CustomerApiService,
        {
          provide: ToastrService,
          useValue: {
            error: vi.fn().mockName("ToastrService.error"),
          }
        },
      ]
    });

    httpMock = TestBed.inject(HttpTestingController);
    apiService = TestBed.inject(CustomerApiService);
    toastrServiceSpy = TestBed.inject(ToastrService) as MockedObject<ToastrService>;
  });

  it('validate customer', () => {
    apiService.validate(null).subscribe();

    const req = httpMock.expectOne({method: 'POST', url: '/customers/validate'});
    req.flush(null);
    httpMock.verify();
  });

  it('create customer', () => {
    const mockCustomer: CustomerData = {
      lastname: 'Müller',
      firstname: 'Max',
      birthDate: moment().subtract(30, 'years').startOf('day').utc().toDate(),
      gender: Gender.MALE,
      address: {
        street: 'Musterstraße',
        houseNumber: '1',
        postalCode: 1010,
        city: 'Wien'
      },
      employer: 'Test GmbH',
      income: 1500
    };

    const mockResponse = {
      data: mockCustomer,
      errorMsg: null
    };

    apiService.createCustomer(mockCustomer, false).subscribe(response => {
      expect(response.data).toEqual(mockCustomer);
      expect(response.errorMsg).toBeNull();
    });

    const req = httpMock.expectOne({method: 'POST', url: '/customers?force=false'});
    req.flush(mockResponse);
    httpMock.verify();
  });

  it('update customer', () => {
    const mockCustomer: CustomerData = {
      id: 133,
      lastname: 'Mustermann',
      firstname: 'Max',
      birthDate: moment().subtract(30, 'years').startOf('day').utc().toDate(),
      gender: Gender.MALE,
      address: {
        street: 'Teststraße',
        houseNumber: '123A',
        door: '21',
        postalCode: 1020,
        city: 'Wien',
      },
      employer: 'test employer',
      income: 1000
    };

    const mockResponse = {
      data: mockCustomer,
      errorMsg: null
    };

    apiService.updateCustomer(mockCustomer, false).subscribe(response => {
      expect(response.data).toEqual(mockCustomer);
      expect(response.errorMsg).toBeNull();
    });

    const req = httpMock.expectOne({method: 'POST', url: '/customers/133?force=false'});
    req.flush(mockResponse);
    httpMock.verify();

    expect(req.request.body).toEqual(mockCustomer);
  });

  it('update customer forced', () => {
    const mockCustomer: CustomerData = {
      id: 133,
      lastname: 'Mustermann',
      firstname: 'Max',
      birthDate: moment().subtract(30, 'years').startOf('day').utc().toDate(),
      gender: Gender.MALE,
      address: {
        street: 'Teststraße',
        houseNumber: '123A',
        door: '21',
        postalCode: 1020,
        city: 'Wien',
      },
      employer: 'test employer',
      income: 1000
    };

    const mockResponse = {
      data: mockCustomer,
      errorMsg: null
    };

    apiService.updateCustomer(mockCustomer, true).subscribe(response => {
      expect(response.data).toEqual(mockCustomer);
      expect(response.errorMsg).toBeNull();
    });

    const req = httpMock.expectOne({method: 'POST', url: '/customers/133?force=true'});
    req.flush(mockResponse);
    httpMock.verify();

    expect(req.request.body).toEqual(mockCustomer);
  });

  it('get customer', () => {
    apiService.getCustomer(1).subscribe();

    const req = httpMock.expectOne({method: 'GET', url: '/customers/1'});
    req.flush(null);
    httpMock.verify();
  });

  it('generate masterdata pdf', () => {
    apiService.generatePdf(1, 'MASTERDATA').subscribe();

    const req = httpMock.expectOne({method: 'GET', url: '/customers/1/generate-pdf?type=MASTERDATA'});
    req.flush(null);
    httpMock.verify();
  });

  it('generate idcard pdf', () => {
    apiService.generatePdf(1, 'IDCARD').subscribe();

    const req = httpMock.expectOne({method: 'GET', url: '/customers/1/generate-pdf?type=IDCARD'});
    req.flush(null);
    httpMock.verify();
  });

  it('generate combined pdf', () => {
    apiService.generatePdf(1, 'COMBINED').subscribe();

    const req = httpMock.expectOne({method: 'GET', url: '/customers/1/generate-pdf?type=COMBINED'});
    req.flush(null);
    httpMock.verify();
  });

  it('search customer with firstname and lastname', () => {
    apiService.searchCustomer('mustermann', 'max').subscribe();

    const req = httpMock.expectOne({method: 'GET', url: '/customers?lastname=mustermann&firstname=max'});
    req.flush(null);
    httpMock.verify();
  });

  it('search customer with lastname only', () => {
    apiService.searchCustomer('mustermann').subscribe();

    const req = httpMock.expectOne({method: 'GET', url: '/customers?lastname=mustermann'});
    req.flush(null);
    httpMock.verify();
  });

  it('search customer with firstname only', () => {
    apiService.searchCustomer(null, 'max').subscribe();

    const req = httpMock.expectOne({method: 'GET', url: '/customers?firstname=max'});
    req.flush(null);
    httpMock.verify();
  });

  it('search customer including postProcessing parameter', () => {
    apiService.searchCustomer(null, null, true, null).subscribe();

    const req = httpMock.expectOne({method: 'GET', url: '/customers?postProcessing=true'});
    req.flush(null);
    httpMock.verify();
  });

  it('search customer including costContribution parameter', () => {
    apiService.searchCustomer(null, null, null, true).subscribe();

    const req = httpMock.expectOne({method: 'GET', url: '/customers?costContribution=true'});
    req.flush(null);
    httpMock.verify();
  });

  it('search customer including valid parameter', () => {
    apiService.searchCustomer(null, null, null, null, true).subscribe();

    const req = httpMock.expectOne({method: 'GET', url: '/customers?valid=true'});
    req.flush(null);
    httpMock.verify();
  });

  it('search customer including page parameter', () => {
    apiService.searchCustomer(null, 'max', null, null, null, 3).subscribe();

    const req = httpMock.expectOne({method: 'GET', url: '/customers?firstname=max&page=3'});
    req.flush(null);
    httpMock.verify();
  });

  it('delete customer', () => {
    apiService.deleteCustomer(1).subscribe();

    const req = httpMock.expectOne({method: 'DELETE', url: '/customers/1'});
    req.flush(null);
    httpMock.verify();
  });

  it('get customer duplicates without page', () => {
    apiService.getCustomerDuplicates().subscribe();

    const req = httpMock.expectOne({method: 'GET', url: '/customers/duplicates'});
    req.flush(null);
    httpMock.verify();
  });

  it('get customer duplicates with page', () => {
    apiService.getCustomerDuplicates(3).subscribe();

    const req = httpMock.expectOne({method: 'GET', url: '/customers/duplicates?page=3'});
    req.flush(null);
    httpMock.verify();
  });

  it('merge customers', () => {
    const targetCustomerId = 123;
    const sourceCustomerIds = [456, 789];
    apiService.mergeCustomers(targetCustomerId, sourceCustomerIds).subscribe();

    const expectedMergeRequest: CustomerMergeRequest = {sourceCustomerIds: sourceCustomerIds};

    const req = httpMock.expectOne({method: 'POST', url: `/customers/${targetCustomerId}/merge`});
    expect(req.request.body).toEqual(expectedMergeRequest);

    req.flush(null);
    httpMock.verify();
  });

});
