import {HttpClientTestingModule, HttpTestingController} from '@angular/common/http/testing';
import {TestBed} from '@angular/core/testing';
import * as moment from 'moment';
import {CustomerApiService} from './customer-api.service';
import {ReactiveFormsModule} from '@angular/forms';

describe('CustomerApiService', () => {
  let httpMock: HttpTestingController;
  let apiService: CustomerApiService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule, ReactiveFormsModule],
      providers: [CustomerApiService]
    });

    httpMock = TestBed.inject(HttpTestingController);
    apiService = TestBed.inject(CustomerApiService);
  });

  it('validate customer', () => {
    apiService.validate(null).subscribe();

    const req = httpMock.expectOne({method: 'POST', url: '/customers/validate'});
    req.flush(null);
    httpMock.verify();
  });

  it('create customer', () => {
    apiService.createCustomer(null).subscribe();

    const req = httpMock.expectOne({method: 'POST', url: '/customers'});
    req.flush(null);
    httpMock.verify();
  });

  it('update customer', () => {
    const mockCustomer = {
      id: 133,
      lastname: 'Mustermann',
      firstname: 'Max',
      birthDate: moment().subtract(30, 'years').startOf('day').utc().toDate(),

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
    apiService.updateCustomer(mockCustomer).subscribe();

    const req = httpMock.expectOne({method: 'POST', url: '/customers/133'});
    req.flush(null);
    httpMock.verify();
  });

  it('get customer', () => {
    apiService.getCustomer(1).subscribe();

    const req = httpMock.expectOne({method: 'GET', url: '/customers/1'});
    req.flush(null);
    httpMock.verify();
  });

  it('generate masterdata pdf', () => {
    apiService.generatePdf(1).subscribe();

    const req = httpMock.expectOne({method: 'GET', url: '/customers/1/generate-masterdata-pdf'});
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

});
